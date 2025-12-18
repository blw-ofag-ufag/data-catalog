import {Component, Input, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractControl, ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator, ValidatorFn, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ObButtonDirective} from '@oblique/oblique';

export interface AffiliatedPerson {
	'prov:agent': string;
	'schema:name'?: string;
	'schema:email'?: string;
	'dcat:hadRole': string;
}

@Component({
	selector: 'app-affiliated-persons-field',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		TranslatePipe,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatButtonModule,
		MatIconModule,
		ObButtonDirective
	],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => AffiliatedPersonsFieldComponent),
			multi: true
		},
		{
			provide: NG_VALIDATORS,
			useExisting: forwardRef(() => AffiliatedPersonsFieldComponent),
			multi: true
		}
	],
	templateUrl: './affiliated-persons-field.component.html',
	styleUrl: './affiliated-persons-field.component.scss'
})
export class AffiliatedPersonsFieldComponent implements ControlValueAccessor, Validator, OnDestroy {
	@Input() label = 'Affiliated Persons';
	@Input() required = false;

	personsArray: FormArray;
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: AffiliatedPerson[] | null) => {};
	private onTouched = () => {};
	private onValidatorChange = () => {};

	readonly roles = [
		{value: 'dataOwner', label: 'Data Owner'},
		{value: 'dataSteward', label: 'Data Steward'},
		{value: 'dataCustodian', label: 'Data Custodian'}
	];

	constructor(private readonly fb: FormBuilder) {
		this.personsArray = this.fb.array([], this.roleRequirementsValidator());

		// Subscribe to form changes
		this.personsArray.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
			this.onChange(value.length > 0 ? value : null);
			this.onValidatorChange(); // Notify that validation state may have changed
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: AffiliatedPerson[] | null): void {
		this.personsArray.clear();
		if (value && Array.isArray(value)) {
			value.forEach(person => {
				this.personsArray.push(this.createPersonGroup(person));
			});
		}
	}

	registerOnChange(fn: (value: AffiliatedPerson[] | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		if (isDisabled) {
			this.personsArray.disable();
		} else {
			this.personsArray.enable();
		}
	}

	addPerson(): void {
		this.personsArray.push(this.createPersonGroup());
		this.onTouched();
		this.onValidatorChange(); // Notify that validation state has changed
	}

	removePerson(index: number): void {
		this.personsArray.removeAt(index);
		this.onTouched();
		this.onValidatorChange(); // Notify that validation state has changed
	}

	private createPersonGroup(person?: AffiliatedPerson): FormGroup {
		return this.fb.group({
			'prov:agent': [person?.['prov:agent'] || '', Validators.required],
			'schema:name': [person?.['schema:name'] || ''],
			'schema:email': [person?.['schema:email'] || '', Validators.email],
			'dcat:hadRole': [person?.['dcat:hadRole'] || '', Validators.required]
		});
	}

	onBlur(): void {
		this.onTouched();
	}

	validate(control: AbstractControl): ValidationErrors | null {
		if (!this.personsArray || this.personsArray.length === 0) {
			if (this.required) {
				return { required: true, message: 'Qualified attribution is required' };
			}
			return null;
		}

		const persons = this.personsArray.value as AffiliatedPerson[];
		const dataOwners = persons.filter(p => p['dcat:hadRole'] === 'dataOwner');
		const dataStewards = persons.filter(p => p['dcat:hadRole'] === 'dataSteward');

		const errors: ValidationErrors = {};

		if (dataOwners.length !== 1) {
			errors['dataOwnerCount'] = {
				required: 1,
				actual: dataOwners.length,
				message: dataOwners.length === 0
					? 'Exactly one Data Owner is required'
					: `Only one Data Owner is allowed (currently ${dataOwners.length})`
			};
		}

		if (dataStewards.length < 1) {
			errors['dataStewardCount'] = {
				required: 1,
				actual: dataStewards.length,
				message: 'At least one Data Steward is required'
			};
		}

		return Object.keys(errors).length > 0 ? errors : null;
	}

	private roleRequirementsValidator(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			const formArray = control as FormArray;
			const persons = formArray.value as AffiliatedPerson[];

			if (!persons || persons.length === 0) {
				return null; // Let required validator handle empty case
			}

			const dataOwners = persons.filter(p => p['dcat:hadRole'] === 'dataOwner');
			const dataStewards = persons.filter(p => p['dcat:hadRole'] === 'dataSteward');

			const errors: ValidationErrors = {};

			if (dataOwners.length !== 1) {
				errors['dataOwnerCount'] = {
					required: 1,
					actual: dataOwners.length
				};
			}

			if (dataStewards.length < 1) {
				errors['dataStewardCount'] = {
					required: 1,
					actual: dataStewards.length
				};
			}

			return Object.keys(errors).length > 0 ? errors : null;
		};
	}

	get hasRoleErrors(): boolean {
		return this.personsArray.hasError('dataOwnerCount') ||
			   this.personsArray.hasError('dataStewardCount');
	}

	get dataOwnerError(): string | null {
		if (this.personsArray.hasError('dataOwnerCount')) {
			const error = this.personsArray.getError('dataOwnerCount');
			if (error.actual === 0) {
				return 'A Data Owner is required';
			} else if (error.actual > 1) {
				return `Only one Data Owner is allowed (currently ${error.actual})`;
			}
		}
		return null;
	}

	get dataStewardError(): string | null {
		if (this.personsArray.hasError('dataStewardCount')) {
			const error = this.personsArray.getError('dataStewardCount');
			return 'At least one Data Steward is required';
		}
		return null;
	}

	registerOnValidatorChange(fn: () => void): void {
		this.onValidatorChange = fn;
	}
}
