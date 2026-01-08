import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {KeywordSelectFieldComponent} from '../../modify/form/components/keyword-select-field/keyword-select-field.component';

@Component({
	selector: 'formly-field-keyword-array',
	standalone: true,
	imports: [KeywordSelectFieldComponent],
	template: `
		<app-keyword-select-field
			[formControl]="formControl"
			[label]="props['label'] || ''"
			[placeholder]="props['placeholder'] || ''"
			[required]="props['required'] || false"
			[recommended]="props['recommended'] || false"
			[fieldName]="key?.toString() || ''"
		></app-keyword-select-field>
	`
})
export class KeywordArrayFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			placeholder: '',
			required: false,
			recommended: false
		}
	};
}