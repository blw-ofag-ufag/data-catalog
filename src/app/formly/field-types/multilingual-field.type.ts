import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {MultilingualTextFieldComponent} from '../../modify/form/components/multilingual-text-field/multilingual-text-field.component';

@Component({
	selector: 'formly-field-multilingual',
	standalone: true,
	imports: [MultilingualTextFieldComponent],
	template: `
		<app-multilingual-text-field
			[formControl]="formControl"
			[label]="props['label'] || ''"
			[placeholder]="props['placeholder'] || ''"
			[required]="props['required'] || false"
			[recommended]="props['recommended'] || false"
			[requiredLanguages]="props['requiredLanguages'] || []"
			[pattern]="props['pattern']"
			[minLength]="props['minLength']"
			[maxLength]="props['maxLength']"
			[textarea]="props['textarea'] || false"
			[fieldName]="key?.toString() || ''"
		></app-multilingual-text-field>
	`
})
export class MultilingualFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			placeholder: '',
			required: false,
			recommended: false,
			requiredLanguages: [],
			textarea: false
		}
	};
}