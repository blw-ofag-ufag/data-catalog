import {Component, Input, OnDestroy, OnInit, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {I14YTheme, I14YThemeService} from '../../../../services/api/i14y-theme.service';
import {FormFieldTooltipComponent} from '../form-field-tooltip/form-field-tooltip.component';
import {FieldDebugOverlayComponent, FieldValidationDebugInfo} from '../field-debug-overlay/field-debug-overlay.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';

@Component({
	selector: 'app-theme-select-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatSelectModule, FormFieldTooltipComponent, FieldDebugOverlayComponent],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => ThemeSelectFieldComponent),
			multi: true
		}
	],
	template: `
		<div class="theme-select-field field-with-tooltip" style="position: relative;">
			<app-field-debug-overlay
				[label]="label"
				[fieldName]="fieldName || ''"
				[required]="required"
				[validationInfo]="getValidationDebugInfo()"
			></app-field-debug-overlay>
			<mat-form-field class="w-100">
				<mat-label>
					{{ label | translate }}
					<span *ngIf="required" class="required-asterisk">*</span>
				</mat-label>
				<mat-select [formControl]="control" (blur)="onBlur()" [placeholder]="placeholder | translate" multiple>
					<mat-select-trigger>
						<span *ngIf="control.value?.length > 0">
							{{ getSelectedThemesDisplay() }}
						</span>
					</mat-select-trigger>
					<mat-option *ngFor="let theme of themes" [value]="theme.code">
						{{ getThemeLabel(theme) }}
					</mat-option>
				</mat-select>
				<mat-error *ngIf="hasError('required')">
					{{ getErrorMessage() | translate }}
				</mat-error>
			</mat-form-field>
			<app-form-field-tooltip [fieldName]="fieldName || label.replace('labels.', '')"></app-form-field-tooltip>
		</div>
	`,
	styleUrl: './theme-select-field.component.scss'
})
export class ThemeSelectFieldComponent implements ControlValueAccessor, OnInit, OnDestroy {
	@Input() label = '';
	@Input() required = false;
	@Input() placeholder = '';
	@Input() fieldName?: string;

	control: FormControl;
	themes: I14YTheme[] = [];
	private readonly destroy$ = new Subject<void>();
	private onChange = (_value: string[] | null) => {};
	private onTouched = () => {};

	constructor(
		private readonly i14yThemeService: I14YThemeService,
		private readonly translateService: TranslateService,
		private readonly validationSchemaService: ValidationSchemaService
	) {
		this.control = new FormControl([]);
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

		// Subscribe to theme changes from I14Y service
		this.i14yThemeService.themes$.pipe(takeUntil(this.destroy$)).subscribe(themes => {
			this.themes = themes;
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: string[] | string | null): void {
		// Handle both array and single string for backward compatibility
		if (value === null || value === undefined) {
			this.control.setValue([], {emitEvent: false});
		} else if (Array.isArray(value)) {
			this.control.setValue(value, {emitEvent: false});
		} else if (typeof value === 'string') {
			// Convert single string to array for backward compatibility
			this.control.setValue(value ? [value] : [], {emitEvent: false});
		} else {
			this.control.setValue([], {emitEvent: false});
		}
	}

	registerOnChange(fn: (value: string[] | null) => void): void {
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

	getThemeLabel(theme: I14YTheme): string {
		const currentLang = this.translateService.currentLang || 'de';

		// Try to get label in current language, fallback to German, then English
		const label = theme.labels[currentLang as keyof typeof theme.labels] || theme.labels.de || theme.labels.en || theme.code;

		return label;
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

	getSelectedThemesDisplay(): string {
		if (!this.control.value || this.control.value.length === 0) {
			return '';
		}

		// Get labels for all selected theme codes
		const selectedLabels = this.control.value
			.map((code: string) => {
				const theme = this.themes.find(t => t.code === code);
				return theme ? this.getThemeLabel(theme) : code;
			})
			.filter((label: string) => label);

		// Join with comma and space
		return selectedLabels.join(', ');
	}
}
