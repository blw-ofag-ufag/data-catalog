import {AbstractControl} from '@angular/forms';
import {FormlyFieldConfig} from '@ngx-formly/core';
import {parseLocalDate} from '../../shared/date-only.util';

export function minDateValidator(control: AbstractControl, field: FormlyFieldConfig): any {
	if (!control.value || !field.props?.['minDate']) {
		return null;
	}

	const inputDate = parseLocalDate(control.value);
	const minDate = parseLocalDate(field.props['minDate']);

	if (inputDate && minDate && inputDate < minDate) {
		return {
			minDate: {
				minDate: field.props['minDate'],
				actualDate: control.value
			}
		};
	}

	return null;
}