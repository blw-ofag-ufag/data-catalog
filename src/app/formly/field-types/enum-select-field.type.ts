import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {EnumSelectFieldComponent} from '../../modify/form/components/enum-select-field/enum-select-field.component';

@Component({
	selector: 'formly-field-enum-select',
	standalone: true,
	imports: [EnumSelectFieldComponent],
	template: `
		<app-enum-select-field
			[formControl]="formControl"
			[label]="props['label'] || ''"
			[options]="props['options'] || []"
			[required]="props['required'] || false"
			[recommended]="props['recommended'] || false"
			[translationPath]="props['translationPath']"
			[multiple]="props['multiple'] || false"
			[fieldName]="key?.toString() || ''"
		></app-enum-select-field>
	`
})
export class EnumSelectFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			options: [],
			required: false,
			recommended: false,
			translationPath: '',
			multiple: false
		}
	};
}