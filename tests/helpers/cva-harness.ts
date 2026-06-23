import {ControlValueAccessor} from '@angular/forms';

/**
 * Asserts the ControlValueAccessor contract on a component instance.
 * Verifies registerOnChange / registerOnTouched store callbacks and
 * setDisabledState does not throw. Per-component value semantics
 * (writeValue effects) are asserted in the individual specs.
 */
export function expectCvaContract(cva: ControlValueAccessor): void {
	const onChange = jest.fn();
	const onTouched = jest.fn();

	expect(() => cva.registerOnChange(onChange)).not.toThrow();
	expect(() => cva.registerOnTouched(onTouched)).not.toThrow();
	expect(() => cva.writeValue(null)).not.toThrow();
	if (cva.setDisabledState) {
		expect(() => cva.setDisabledState!(true)).not.toThrow();
		expect(() => cva.setDisabledState!(false)).not.toThrow();
	}
}
