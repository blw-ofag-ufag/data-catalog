import {Component, Input, OnDestroy, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTabsModule} from '@angular/material/tabs';

export interface MultilingualText {
	de: string;
	fr: string;
	it?: string;
	en?: string;
}

@Component({
	selector: 'app-multilingual-text-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatInputModule, MatTabsModule],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => MultilingualTextFieldComponent),
			multi: true
		}
	],
	templateUrl: './multilingual-text-field.component.html',
	styleUrl: './multilingual-text-field.component.scss'
})
export class MultilingualTextFieldComponent implements ControlValueAccessor, OnDestroy {
	@Input() label = '';
	@Input() placeholder = '';
	@Input() required = false;
	@Input() textarea = false;
	@Input() maxLength?: number;

	formGroup: FormGroup;
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: MultilingualText | null) => {};
	private onTouched = () => {};

	readonly languages = [
		{code: 'de', label: 'Deutsch'},
		{code: 'fr', label: 'Français'},
		{code: 'it', label: 'Italiano'},
		{code: 'en', label: 'English'}
	];

	constructor() {
		const validators = this.required ? [Validators.required] : [];

		this.formGroup = new FormGroup({
			de: new FormControl('', validators),
			fr: new FormControl('', validators),
			it: new FormControl(''),
			en: new FormControl('')
		});

		// Subscribe to form changes
		this.formGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
			this.onChange(value);
		});
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
			return `modify.auth.form.validation.required`;
		}
		if (control.hasError('maxlength')) {
			return `modify.auth.form.validation.maxLength`;
		}
		return '';
	}
}
