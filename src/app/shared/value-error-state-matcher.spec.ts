import {FormControl, Validators} from '@angular/forms';
import {ValueErrorStateMatcher} from './value-error-state-matcher';

describe('ValueErrorStateMatcher', () => {
	const matcher = new ValueErrorStateMatcher();

	function control(value: string, validators: Parameters<FormControl['setValidators']>[0]): FormControl {
		const c = new FormControl(value);
		c.setValidators(validators);
		c.updateValueAndValidity();
		return c;
	}

	it('flags an over-long value on a pristine, untouched control (loaded data)', () => {
		const c = control('x'.repeat(80), [Validators.maxLength(75)]);
		expect(c.touched).toBe(false);
		expect(matcher.isErrorState(c, null)).toBe(true);
	});

	it('flags a too-short value without interaction', () => {
		const c = control('x', [Validators.minLength(10)]);
		expect(matcher.isErrorState(c, null)).toBe(true);
	});

	it('flags a pattern violation without interaction', () => {
		const c = control('123', [Validators.pattern('[a-z]+')]);
		expect(matcher.isErrorState(c, null)).toBe(true);
	});

	it('does not flag a missing required value until touched', () => {
		const c = control('', [Validators.required]);
		expect(matcher.isErrorState(c, null)).toBe(false);
		c.markAsTouched();
		expect(matcher.isErrorState(c, null)).toBe(true);
	});

	it('treats a submitted form as interacted for required errors', () => {
		const c = control('', [Validators.required]);
		expect(matcher.isErrorState(c, {submitted: true} as never)).toBe(true);
	});

	it('never flags a valid control', () => {
		const c = control('fine', [Validators.maxLength(75), Validators.minLength(2)]);
		expect(matcher.isErrorState(c, null)).toBe(false);
	});

	it('is safe with a null control', () => {
		expect(matcher.isErrorState(null, null)).toBe(false);
	});
});
