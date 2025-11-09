import {Component, Input, OnDestroy, OnInit, forwardRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {I14YTheme, I14YThemeService} from '../../../../services/api/i14y-theme.service';

@Component({
	selector: 'app-theme-select-field',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatSelectModule],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => ThemeSelectFieldComponent),
			multi: true
		}
	],
	template: `
		<mat-form-field class="w-100">
			<mat-label>
				{{ label | translate }}
				<span *ngIf="required" class="required-asterisk">*</span>
			</mat-label>
			<mat-select [formControl]="control" (blur)="onBlur()" [placeholder]="placeholder | translate">
				<!--				<mat-option value="">{{ 'modify.auth.form.options.none' | translate }}</mat-option>-->
				<mat-option *ngFor="let theme of themes" [value]="theme.code">
					{{ getThemeLabel(theme) }}
				</mat-option>
			</mat-select>
			<mat-error *ngIf="hasError('required')">
				{{ getErrorMessage() | translate }}
			</mat-error>
		</mat-form-field>
	`,
	styleUrl: './theme-select-field.component.scss'
})
export class ThemeSelectFieldComponent implements ControlValueAccessor, OnInit, OnDestroy {
	@Input() label = '';
	@Input() required = false;
	@Input() placeholder = '';

	control: FormControl;
	themes: I14YTheme[] = [];
	private readonly destroy$ = new Subject<void>();
	private onChange = (value: string | null) => {};
	private onTouched = () => {};

	constructor(
		private readonly i14yThemeService: I14YThemeService,
		private readonly translateService: TranslateService
	) {
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

		// Subscribe to theme changes from I14Y service
		this.i14yThemeService.themes$.pipe(takeUntil(this.destroy$)).subscribe(themes => {
			this.themes = themes;
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
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
}
