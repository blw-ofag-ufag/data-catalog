import {Component} from '@angular/core';
import {FieldType, FieldTypeConfig} from '@ngx-formly/core';
import {DistributionFieldComponent} from '../../modify/form/components/distribution-field/distribution-field.component';

@Component({
	selector: 'formly-field-distribution',
	standalone: true,
	imports: [DistributionFieldComponent],
	template: `
		<app-distribution-field
			[formControl]="formControl"
			[label]="props['label'] || ''"
			[required]="props['required'] || false"
			[recommended]="props['recommended'] || false"
		></app-distribution-field>
	`
})
export class DistributionFieldType extends FieldType<FieldTypeConfig> {
	override defaultOptions = {
		props: {
			label: '',
			required: false,
			recommended: false
		}
	};
}