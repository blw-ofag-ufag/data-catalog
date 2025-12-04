import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {ReactiveFormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {CommonModule} from '@angular/common';

@Component({
	selector: 'formly-field-text',
	standalone: true,
	imports: [
		CommonModule,
		MatFormFieldModule,
		MatInputModule,
		ReactiveFormsModule,
		TranslatePipe
	],
	template: `
		<mat-form-field appearance="outline" class="ob-w-full">
			<mat-label>{{ props['label'] || '' | translate }}</mat-label>
			<input
				*ngIf="!props['textarea']"
				matInput
				[formControl]="formControl"
				[placeholder]="props['placeholder'] || '' | translate"
				[required]="props['required'] || false"
				[type]="props['type'] || 'text'"
			/>
			<textarea
				*ngIf="props['textarea']"
				matInput
				[formControl]="formControl"
				[placeholder]="props['placeholder'] || '' | translate"
				[required]="props['required'] || false"
				[rows]="props['rows'] || 3"
			></textarea>
			<mat-error *ngIf="showError">
				<span>{{ getErrorMessage() | translate }}</span>
			</mat-error>
		</mat-form-field>
	`
})
export class TextFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			placeholder: '',
			required: false,
			textarea: false,
			rows: 3,
			type: 'text'
		}
	};

	getErrorMessage(): string {
		if (this.formControl.hasError('required')) {
			return 'modify.auth.form.validation.required';
		}
		if (this.formControl.hasError('minlength')) {
			return 'modify.auth.form.validation.minLength';
		}
		if (this.formControl.hasError('maxlength')) {
			return 'modify.auth.form.validation.maxLength';
		}
		if (this.formControl.hasError('pattern')) {
			return 'modify.auth.form.validation.pattern';
		}
		return '';
	}
}