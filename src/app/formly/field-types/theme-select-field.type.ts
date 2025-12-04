import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {ThemeSelectFieldComponent} from '../../modify/form/components/theme-select-field/theme-select-field.component';

@Component({
	selector: 'formly-field-theme-select',
	standalone: true,
	imports: [ThemeSelectFieldComponent],
	template: `
		<app-theme-select-field
			[formControl]="formControl"
			[label]="props['label'] || ''"
			[placeholder]="props['placeholder'] || ''"
			[required]="props['required'] || false"
			[recommended]="props['recommended'] || false"
		></app-theme-select-field>
	`
})
export class ThemeSelectFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			placeholder: '',
			required: false,
			recommended: false
		}
	};
}