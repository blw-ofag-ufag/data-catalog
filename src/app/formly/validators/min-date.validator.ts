import {AbstractControl} from '@angular/forms';
import {FormlyFieldConfig} from '@ngx-formly/core';

export function minDateValidator(control: AbstractControl, field: FormlyFieldConfig): any {
	if (!control.value || !field.props?.['minDate']) {
		return null;
	}

	const inputDate = new Date(control.value);
	const minDate = new Date(field.props['minDate']);

	if (inputDate < minDate) {
		return {
			minDate: {
				minDate: field.props['minDate'],
				actualDate: control.value
			}
		};
	}

	return null;
}