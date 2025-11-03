import {Component, Input, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
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
		}
	],
	templateUrl: './affiliated-persons-field.component.html',
	styleUrl: './affiliated-persons-field.component.scss'
})
export class AffiliatedPersonsFieldComponent implements ControlValueAccessor, OnDestroy {
	@Input() label = 'Affiliated Persons';
	@Input() required = false;

	personsArray: FormArray;
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: AffiliatedPerson[] | null) => {};
	private onTouched = () => {};

	readonly roles = [
		{value: 'businessDataOwner', label: 'Business Data Owner'},
		{value: 'dataSteward', label: 'Data Steward'},
		{value: 'dataCustodian', label: 'Data Custodian'}
	];

	constructor(private readonly fb: FormBuilder) {
		this.personsArray = this.fb.array([]);

		// Subscribe to form changes
		this.personsArray.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
			this.onChange(value.length > 0 ? value : null);
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
	}

	removePerson(index: number): void {
		this.personsArray.removeAt(index);
		this.onTouched();
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
}
