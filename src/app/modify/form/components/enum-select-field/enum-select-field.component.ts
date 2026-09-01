import {Component, Input, OnInit, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormFieldTooltipComponent} from '../form-field-tooltip/form-field-tooltip.component';
import {FieldDebugOverlayComponent, FieldValidationDebugInfo} from '../field-debug-overlay/field-debug-overlay.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';

@Component({
	selector: 'app-enum-select-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatSelectModule, FormFieldTooltipComponent, FieldDebugOverlayComponent],
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
	@Input() fieldName?: string;

	control: FormControl;
	private onChange = (_value: string | null) => {};
	private onTouched = () => {};

	constructor(private readonly validationSchemaService: ValidationSchemaService) {
		this.control = new FormControl('');
	}

	getValidationDebugInfo(): FieldValidationDebugInfo {
		const schemaFieldKey = this.fieldName || this.label.replace('labels.', '');
		const schemaInfo = this.validationSchemaService.getFieldDebugInfo(schemaFieldKey);

		// Add component-level validation messages
		const componentMessages: {text: string; source: 'hardcoded'}[] = [];
		if (this.required) {
			componentMessages.push({text: 'Required', source: 'hardcoded'});
		}

		return {
			...schemaInfo,
			componentMessages: componentMessages.length > 0 ? componentMessages : undefined
		};
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
