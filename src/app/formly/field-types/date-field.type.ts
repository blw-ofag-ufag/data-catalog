import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {ReactiveFormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {CommonModule} from '@angular/common';

@Component({
	selector: 'formly-field-date',
	standalone: true,
	imports: [
		CommonModule,
		MatFormFieldModule,
		MatInputModule,
		MatDatepickerModule,
		ReactiveFormsModule,
		TranslatePipe
	],
	template: `
		<mat-form-field appearance="outline" class="ob-w-full">
			<mat-label>{{ props['label'] || '' | translate }}</mat-label>
			<input
				matInput
				[matDatepicker]="picker"
				[formControl]="formControl"
				[min]="props['minDate']"
				[max]="props['maxDate']"
				[required]="props['required'] || false"
			/>
			<mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
			<mat-datepicker #picker></mat-datepicker>
			<mat-error *ngIf="showError">
				<span>{{ getErrorMessage() | translate }}</span>
			</mat-error>
		</mat-form-field>
	`
})
export class DateFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			required: false,
			minDate: null,
			maxDate: null
		}
	};

	getErrorMessage(): string {
		if (this.formControl.hasError('required')) {
			return 'modify.auth.form.validation.required';
		}
		if (this.formControl.hasError('minDate')) {
			return 'modify.auth.form.validation.minDate';
		}
		if (this.formControl.hasError('maxDate')) {
			return 'modify.auth.form.validation.maxDate';
		}
		return '';
	}
}