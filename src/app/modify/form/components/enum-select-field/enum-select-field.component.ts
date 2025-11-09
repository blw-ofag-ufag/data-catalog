import {Component, Input, OnInit, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';

@Component({
	selector: 'app-enum-select-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatSelectModule],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => EnumSelectFieldComponent),
			multi: true
		}
	],
	templateUrl: './enum-select-field.component.html',
	styleUrl: './enum-select-field.component.scss'
})
export class EnumSelectFieldComponent implements ControlValueAccessor, OnInit {
	@Input() label = '';
	@Input() options: readonly string[] = [];
	@Input() required = false;
	@Input() recommended = false;
	@Input() translationPath = '';
	@Input() placeholder = '';

	control: FormControl;
	private onChange = (value: string | null) => {};
	private onTouched = () => {};

	constructor() {
		this.control = new FormControl('');
	}

	ngOnInit(): void {
		// Set validators based on required input
		if (this.required) {
			this.control.setValidators([Validators.required]);
		}

		// Subscribe to control changes
		this.control.valueChanges.subscribe(value => {
			this.onChange(value);
		});
	}

	writeValue(value: string | null): void {
		this.control.setValue(value, {emitEvent: false});
	}

	registerOnChange(fn: (value: string | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		if (isDisabled) {
			this.control.disable();
		} else {
			this.control.enable();
		}
	}

	onBlur(): void {
		this.onTouched();
	}

	get filteredOptions(): readonly string[] {
		return this.options.filter(option => option && option.trim() !== '');
	}

	getOptionTranslationKey(option: string): string {
		if (this.translationPath) {
			return `${this.translationPath}.${option}`;
		}
		return option;
	}

	hasError(errorType: string): boolean {
		return this.control.hasError(errorType) && (this.control.dirty || this.control.touched);
	}

	getErrorMessage(): string {
		if (this.control.hasError('required')) {
			return 'modify.auth.form.validation.required';
		}
		return '';
	}
}
