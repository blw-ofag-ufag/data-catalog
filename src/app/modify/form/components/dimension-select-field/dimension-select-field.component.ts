import {Component, Input, OnDestroy, OnInit, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {Dimension, DimensionService} from '../../../../services/api/dimension.service';
import {FormFieldTooltipComponent} from '../form-field-tooltip/form-field-tooltip.component';
import {FieldDebugOverlayComponent, FieldValidationDebugInfo} from '../field-debug-overlay/field-debug-overlay.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';

/**
 * Multi-select for a distribution's `bv:dimensions` (issue #92). Mirrors
 * {@link KeywordSelectFieldComponent}: options come from the dimension glossary
 * (`DimensionService`), the control value is the list of selected dimension codes.
 */
@Component({
	selector: 'app-dimension-select-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatSelectModule, FormFieldTooltipComponent, FieldDebugOverlayComponent],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => DimensionSelectFieldComponent),
			multi: true
		}
	],
	template: `
		<div class="dimension-select-field field-with-tooltip" style="position: relative;">
			<app-field-debug-overlay [label]="label" [fieldName]="fieldName || ''" [required]="required" [validationInfo]="getValidationDebugInfo()"></app-field-debug-overlay>
			<mat-form-field class="w-100">
				<mat-label>
					{{ label | translate }}
					<span *ngIf="required" class="required-asterisk">*</span>
				</mat-label>
				<mat-select [formControl]="control" (blur)="onBlur()" [placeholder]="placeholder | translate" multiple>
					<mat-select-trigger>
						<span *ngIf="control.value?.length > 0">
							{{ getSelectedDimensionsDisplay() }}
						</span>
					</mat-select-trigger>
					<mat-option *ngFor="let dimension of dimensions" [value]="dimension.code">
						{{ getDimensionLabel(dimension) }}
					</mat-option>
				</mat-select>
				<mat-error *ngIf="hasError('required')">
					{{ getErrorMessage() | translate }}
				</mat-error>
			</mat-form-field>
			<app-form-field-tooltip [fieldName]="fieldName || label.replace('labels.', '')"></app-form-field-tooltip>
		</div>
	`,
	styleUrl: './dimension-select-field.component.scss'
})
export class DimensionSelectFieldComponent implements ControlValueAccessor, OnInit, OnDestroy {
	@Input() label = '';
	@Input() required = false;
	@Input() recommended = false;
	@Input() placeholder = '';
	@Input() fieldName?: string;

	control: FormControl;
	dimensions: Dimension[] = [];
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: string[] | null) => {};
	private onTouched = () => {};

	constructor(
		private readonly dimensionService: DimensionService,
		private readonly translateService: TranslateService,
		private readonly validationSchemaService: ValidationSchemaService
	) {
		this.control = new FormControl([]);
	}

	getValidationDebugInfo(): FieldValidationDebugInfo {
		const schemaFieldKey = this.fieldName || this.label.replace('labels.', '');
		const schemaInfo = this.validationSchemaService.getFieldDebugInfo(schemaFieldKey);

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
		if (this.required) {
			this.control.setValidators([Validators.required]);
		}

		this.control.valueChanges.subscribe(value => {
			this.onChange(value);
		});

		this.dimensionService.dimensions$.pipe(takeUntil(this.destroy$)).subscribe(dimensions => {
			this.dimensions = dimensions;
		});

		this.dimensionService.loadDimensions().pipe(takeUntil(this.destroy$)).subscribe();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	writeValue(value: string[] | string | null): void {
		if (value === null || value === undefined) {
			this.control.setValue([], {emitEvent: false});
		} else if (Array.isArray(value)) {
			this.control.setValue(value, {emitEvent: false});
		} else if (typeof value === 'string') {
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

	getDimensionLabel(dimension: Dimension): string {
		const currentLang = this.translateService.currentLang || 'de';
		return dimension.labels[currentLang as keyof typeof dimension.labels] || dimension.labels.de || dimension.labels.en || dimension.code;
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

	getSelectedDimensionsDisplay(): string {
		if (!this.control.value || this.control.value.length === 0) {
			return '';
		}

		const selectedLabels = this.control.value
			.map((code: string) => {
				const dimension = this.dimensions.find(d => d.code === code);
				return dimension ? this.getDimensionLabel(dimension) : code;
			})
			.filter((label: string) => label);

		return selectedLabels.join(', ');
	}
}
