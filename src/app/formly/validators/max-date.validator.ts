import {AbstractControl} from '@angular/forms';
import {FormlyFieldConfig} from '@ngx-formly/core';

export function maxDateValidator(control: AbstractControl, field: FormlyFieldConfig): any {
	if (!control.value || !field.props?.['maxDate']) {
		return null;
	}

	const inputDate = new Date(control.value);
	const maxDate = new Date(field.props['maxDate']);

	if (inputDate > maxDate) {
		return {
			maxDate: {
				maxDate: field.props['maxDate'],
				actualDate: control.value
			}
		};
	}

	return null;
}