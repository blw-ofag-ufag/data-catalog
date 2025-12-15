import {Component, Input, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractControl, ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {ObButtonDirective} from '@oblique/oblique';
import {MultilingualTextFieldComponent} from '../multilingual-text-field/multilingual-text-field.component';

export interface MultilingualText {
	de: string;
	fr: string;
	it?: string;
	en?: string;
}

export interface Distribution {
	'dct:identifier': string;
	'dcat:accessURL': string;
	'adms:status': string;
	'dcatap:availability'?: string;
	'dct:format': string;
	'dct:modified': string | null;
	'dcat:downloadURL'?: string;
	'dct:title'?: MultilingualText;
	'dct:description'?: MultilingualText;
	'dct:conformsTo'?: string;
	'dct:license'?: string;
	'schema:comment'?: string;
}

@Component({
	selector: 'app-distribution-field',
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
		MatDatepickerModule,
		MatNativeDateModule,
		ObButtonDirective,
		MultilingualTextFieldComponent
	],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => DistributionFieldComponent),
			multi: true
		},
		{
			provide: NG_VALIDATORS,
			useExisting: forwardRef(() => DistributionFieldComponent),
			multi: true
		}
	],
	templateUrl: './distribution-field.component.html',
	styleUrl: './distribution-field.component.scss'
})
export class DistributionFieldComponent implements ControlValueAccessor, Validator, OnDestroy {
	@Input() label = 'Distributions';
	@Input() required = false;

	distributionsArray: FormArray;
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: Distribution[] | null) => {};
	private onTouched = () => {};
	private onValidatorChange = () => {};

	statuses: Array<{value: string; label: string}> = [];

	availabilities: Array<{value: string; label: string}> = [];

	licenses: Array<{value: string; label: string}> = [];

	constructor(
		private readonly fb: FormBuilder,
		private readonly translateService: TranslateService
	) {
		this.distributionsArray = this.fb.array([]);

		// Initialize translation arrays
		this.initializeTranslations();

		// Subscribe to form changes
		this.distributionsArray.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
			this.onChange(value.length > 0 ? value : null);
			this.onValidatorChange(); // Notify that validation state may have changed
		});

		// Update translations when language changes
		this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
			this.initializeTranslations();
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: Distribution[] | null): void {
		this.distributionsArray.clear();
		if (value && Array.isArray(value)) {
			value.forEach(distribution => {
				this.distributionsArray.push(this.createDistributionGroup(distribution));
			});
		}
	}

	registerOnChange(fn: (value: Distribution[] | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		if (isDisabled) {
			this.distributionsArray.disable();
		} else {
			this.distributionsArray.enable();
		}
	}

	addDistribution(): void {
		this.distributionsArray.push(this.createDistributionGroup());
		this.onTouched();
		this.onValidatorChange(); // Notify that validation state has changed
	}

	removeDistribution(index: number): void {
		this.distributionsArray.removeAt(index);
		this.onTouched();
		this.onValidatorChange(); // Notify that validation state has changed
	}

	private createDistributionGroup(distribution?: Distribution): FormGroup {
		// Handle date conversion - if it's a string, convert to Date object
		let modifiedDate = null;
		if (distribution?.['dct:modified']) {
			if (typeof distribution['dct:modified'] === 'string') {
				modifiedDate = new Date(distribution['dct:modified']);
			} else {
				modifiedDate = distribution['dct:modified'];
			}
		}

		return this.fb.group({
			'dct:identifier': [distribution?.['dct:identifier'] || '', Validators.required],
			'dcat:accessURL': [distribution?.['dcat:accessURL'] || '', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
			'adms:status': [distribution?.['adms:status'] || '', Validators.required],
			'dcatap:availability': [distribution?.['dcatap:availability'] || ''],
			'dct:format': [distribution?.['dct:format'] || '', Validators.required],
			'dct:modified': [modifiedDate],
			'dcat:downloadURL': [distribution?.['dcat:downloadURL'] || '', Validators.pattern(/^https?:\/\/.+/)],
			'dct:title': [distribution?.['dct:title'] || null, Validators.required],
			'dct:description': [distribution?.['dct:description'] || null, Validators.required],
			'dct:conformsTo': [distribution?.['dct:conformsTo'] || ''],
			'dct:license': [distribution?.['dct:license'] || ''],
			'schema:comment': [distribution?.['schema:comment'] || '']
		});
	}

	onBlur(): void {
		this.onTouched();
	}

	validate(control: AbstractControl): ValidationErrors | null {
		// Check if the FormArray is valid
		if (this.distributionsArray && this.distributionsArray.invalid) {
			// Collect errors from all invalid distributions
			const errors: any = {};
			const errorMessages: string[] = [];
			let hasErrors = false;

			this.distributionsArray.controls.forEach((distributionGroup, index) => {
				if (distributionGroup.invalid) {
					hasErrors = true;
					// Check specifically for title and description validation
					const titleControl = distributionGroup.get('dct:title');
					const descControl = distributionGroup.get('dct:description');

					if (titleControl?.invalid) {
						errors[`distribution_${index}_title`] = true;
						errorMessages.push(`Distribution ${index + 1}: Title requires German and French`);
					}
					if (descControl?.invalid) {
						errors[`distribution_${index}_description`] = true;
						errorMessages.push(`Distribution ${index + 1}: Description requires German and French`);
					}
				}
			});

			if (hasErrors) {
				errors['message'] = errorMessages.join(', ');
				return errors;
			}
		}
		return null;
	}

	registerOnValidatorChange(fn: () => void): void {
		this.onValidatorChange = fn;
	}

	private initializeTranslations(): void {
		this.statuses = [
			{value: '', label: this.translateService.instant('modify.auth.form.options.selectStatus')},
			{value: 'workInProgress', label: this.translateService.instant('choices.dataset.adms:status.workInProgress')},
			{value: 'validated', label: this.translateService.instant('choices.dataset.adms:status.validated')},
			{value: 'published', label: this.translateService.instant('choices.dataset.adms:status.published')},
			{value: 'deleted', label: this.translateService.instant('choices.dataset.adms:status.deleted')},
			{value: 'archived', label: this.translateService.instant('choices.dataset.adms:status.archived')}
		];

		this.availabilities = [
			{value: '', label: this.translateService.instant('modify.auth.form.options.selectAvailability')},
			{value: 'AVAILABLE', label: this.translateService.instant('choices.dataset.dcatap:availability.AVAILABLE')},
			{value: 'EXPERIMENTAL', label: this.translateService.instant('choices.dataset.dcatap:availability.EXPERIMENTAL')},
			{value: 'STABLE', label: this.translateService.instant('choices.dataset.dcatap:availability.STABLE')},
			{value: 'TEMPORARY', label: this.translateService.instant('choices.dataset.dcatap:availability.TEMPORARY')}
		];

		this.licenses = [
			{value: '', label: this.translateService.instant('modify.auth.form.options.selectLicense')},
			{value: 'terms_open', label: this.translateService.instant('choices.distribution.license.terms_open')},
			{value: 'terms_by', label: this.translateService.instant('choices.distribution.license.terms_by')},
			{value: 'terms_ask', label: this.translateService.instant('choices.distribution.license.terms_ask')},
			{value: 'terms_by_ask', label: this.translateService.instant('choices.distribution.license.terms_by_ask')},
			{value: 'cc-zero', label: this.translateService.instant('choices.distribution.license.cc-zero')},
			{value: 'cc-by/4.0', label: this.translateService.instant('choices.distribution.license.cc-by/4.0')},
			{value: 'cc-by-sa/4.0', label: this.translateService.instant('choices.distribution.license.cc-by-sa/4.0')}
		];
	}
}
