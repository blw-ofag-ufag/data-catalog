import {FormControl, FormGroupDirective, NgForm} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';

/**
 * ErrorStateMatcher for the multilingual title/description fields.
 *
 * The default matcher only turns a field red once it is touched or the form is submitted, which
 * means an existing record loaded with e.g. an over-75-character title showed no message at all
 * until the user interacted (#dev feedback). Value-based violations (maxlength / minlength /
 * pattern) describe data that is already wrong, so they are surfaced immediately even on a
 * pristine, untouched control. Emptiness of a required field still waits for interaction, to
 * avoid flagging every blank field the moment the form opens.
 */
export class ValueErrorStateMatcher implements ErrorStateMatcher {
	isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
		if (!control || control.valid) {
			return false;
		}
		const valueError = control.hasError('maxlength') || control.hasError('minlength') || control.hasError('pattern');
		if (valueError) {
			return true;
		}
		return control.touched || !!form?.submitted;
	}
}
