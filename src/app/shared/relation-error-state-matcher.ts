import {FormControl, FormGroupDirective, NgForm} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';

/**
 * ErrorStateMatcher that also turns a field red when a cross-field relation error
 * (e.g. dct:issued > dct:modified) is present on the parent form/group. Such errors
 * live on the group, not the individual control, so the default matcher never flags
 * the involved inputs. The relation is only surfaced once the control is touched (or
 * the form submitted), matching the rest of the form's error-display behaviour.
 */
export class RelationErrorStateMatcher implements ErrorStateMatcher {
	constructor(private readonly hasRelationError: () => boolean) {}

	isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
		const interacted = !!(control && (control.touched || form?.submitted));
		const ownError = !!(control && control.invalid && interacted);
		const relationError = interacted && this.hasRelationError();
		return ownError || relationError;
	}
}
