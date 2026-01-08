import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {AffiliatedPersonsFieldComponent} from '../../modify/form/components/affiliated-persons-field/affiliated-persons-field.component';

@Component({
	selector: 'formly-field-affiliated-persons',
	standalone: true,
	imports: [AffiliatedPersonsFieldComponent],
	template: `
		<app-affiliated-persons-field
			[formControl]="formControl"
			[label]="props['label'] || ''"
			[required]="props['required'] || false"
			[recommended]="props['recommended'] || false"
			[fieldName]="key?.toString() || ''"
		></app-affiliated-persons-field>
	`
})
export class AffiliatedPersonsFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			required: false,
			recommended: false
		}
	};
}