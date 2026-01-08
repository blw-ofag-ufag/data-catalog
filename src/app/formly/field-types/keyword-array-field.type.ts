import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {KeywordsFieldComponent} from '../../modify/form/components/keywords-field/keywords-field.component';

@Component({
	selector: 'formly-field-keyword-array',
	standalone: true,
	imports: [KeywordsFieldComponent],
	template: `
		<app-keywords-field
			[formControl]="formControl"
			[label]="props['label'] || ''"
			[placeholder]="props['placeholder'] || ''"
			[required]="props['required'] || false"
			[recommended]="props['recommended'] || false"
			[fieldName]="key?.toString() || ''"
		></app-keywords-field>
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