import {Component, Input, OnInit, OnChanges, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
	AbstractControl,
	ControlValueAccessor,
	FormControl,
	FormGroup,
	NG_VALIDATORS,
	NG_VALUE_ACCESSOR,
	ReactiveFormsModule,
	ValidationErrors,
	Validator,
	Validators
} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';
import {FormFieldTooltipComponent} from '../form-field-tooltip/form-field-tooltip.component';
import {FieldDebugOverlayComponent} from '../field-debug-overlay/field-debug-overlay.component';

export interface MultilingualText {
	de: string;
	fr: string;
	it?: string;
	en?: string;
}

@Component({
	selector: 'app-multilingual-text-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatInputModule, MatTabsModule, FormFieldTooltipComponent, FieldDebugOverlayComponent],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => MultilingualTextFieldComponent),
			multi: true
		},
		{
			provide: NG_VALIDATORS,
			useExisting: forwardRef(() => MultilingualTextFieldComponent),
			multi: true
		}
	],
	templateUrl: './multilingual-text-field.component.html',
	styleUrl: './multilingual-text-field.component.scss'
})
export class MultilingualTextFieldComponent implements ControlValueAccessor, Validator, OnInit, OnChanges, OnDestroy {
	@Input() label = '';
	@Input() placeholder = '';
	@Input() required = false;
	@Input() recommended = false;
	@Input() textarea = false;
	@Input() maxLength?: number;
	@Input() requiredLanguages: string[] = [];
	@Input() pattern?: string;
	@Input() minLength?: number;
	@Input() hideLabel = false;
	@Input() hideHelp = false;
	@Input() fieldName?: string;

	formGroup: FormGroup;
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: MultilingualText | null) => {};
	private onTouched = () => {};
	private onValidatorChange = () => {};

	readonly languages = [
		{code: 'de', label: 'Deutsch'},
		{code: 'fr', label: 'Français'},
		{code: 'it', label: 'Italiano'},
		{code: 'en', label: 'English'}
	];

	constructor() {
		this.formGroup = new FormGroup({
			de: new FormControl(''),
			fr: new FormControl(''),
			it: new FormControl(''),
			en: new FormControl('')
		});

		// Subscribe to form changes
		this.formGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
			this.onChange(value);
		});
	}

	ngOnInit(): void {
		this.updateValidators();
	}

	ngOnChanges(changes: any): void {
		if (changes['requiredLanguages'] || changes['required']) {
			this.updateValidators();
		}
	}

	private updateValidators(): void {
		// Set validators based on requiredLanguages or general required setting
		const languages = ['de', 'fr', 'it', 'en'];
		languages.forEach(lang => {
			const control = this.formGroup.get(lang);
			if (control) {
				const validators = [];
				// Check if this specific language is required
				if (this.requiredLanguages.includes(lang) || (this.required && (lang === 'de' || lang === 'fr'))) {
					validators.push(Validators.required);
				}
				if (this.minLength) {
					validators.push(Validators.minLength(this.minLength));
				}
				if (this.maxLength) {
					validators.push(Validators.maxLength(this.maxLength));
				}
				if (this.pattern) {
					validators.push(Validators.pattern(this.pattern));
				}
				control.setValidators(validators);
				control.updateValueAndValidity();
			}
		});

		// Notify that validation has changed
		this.onValidatorChange();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: MultilingualText | null): void {
		if (value) {
			this.formGroup.patchValue(value, {emitEvent: false});
		} else {
			this.formGroup.reset({emitEvent: false});
		}
	}

	registerOnChange(fn: (value: MultilingualText | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		if (isDisabled) {
			this.formGroup.disable();
		} else {
			this.formGroup.enable();
		}
	}

	onBlur(): void {
		this.onTouched();
	}

	getControl(language: string): FormControl {
		return this.formGroup.get(language) as FormControl;
	}

	hasError(language: string, errorType: string): boolean {
		const control = this.getControl(language);
		return control.hasError(errorType) && (control.dirty || control.touched);
	}

	getErrorMessage(language: string): string {
		const control = this.getControl(language);
		if (control.hasError('required')) {
			return 'modify.auth.form.validation.required';
		}
		if (control.hasError('minlength')) {
			return 'modify.auth.form.validation.minLength';
		}
		if (control.hasError('maxlength')) {
			return 'modify.auth.form.validation.maxLength';
		}
		if (control.hasError('pattern')) {
			// Return translation key for pattern validation
			if (this.label.includes('title')) {
				return 'modify.auth.form.validation.titlePattern';
			}
			return 'modify.auth.form.validation.pattern';
		}
		return '';
	}

	isLanguageRequired(language: string): boolean {
		return this.requiredLanguages.includes(language) || (this.required && (language === 'de' || language === 'fr'));
	}

	validate(control: AbstractControl): ValidationErrors | null {
		// If the internal form group is invalid, return the errors
		if (this.formGroup && this.formGroup.invalid) {
			const errors: ValidationErrors = {};

			// Check each required language
			this.requiredLanguages.forEach(lang => {
				const langControl = this.formGroup.get(lang);
				if (langControl?.invalid) {
					errors[`${lang}Required`] = true;
				}
			});

			// Return errors if any
			return Object.keys(errors).length > 0 ? errors : null;
		}

		return null;
	}

	registerOnValidatorChange(fn: () => void): void {
		this.onValidatorChange = fn;
	}
}
