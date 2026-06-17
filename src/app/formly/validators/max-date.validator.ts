import {AbstractControl} from '@angular/forms';
import {FormlyFieldConfig} from '@ngx-formly/core';
import {parseLocalDate} from '../../shared/date-only.util';

export function maxDateValidator(control: AbstractControl, field: FormlyFieldConfig): any {
	if (!control.value || !field.props?.['maxDate']) {
		return null;
	}

	const inputDate = parseLocalDate(control.value);
	const maxDate = parseLocalDate(field.props['maxDate']);

	if (inputDate && maxDate && inputDate > maxDate) {
		return {
			maxDate: {
				maxDate: field.props['maxDate'],
				actualDate: control.value
			}
		};
	}

	return null;
}