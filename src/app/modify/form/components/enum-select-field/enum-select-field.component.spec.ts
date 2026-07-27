import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {EnumSelectFieldComponent} from './enum-select-field.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubValidationSchemaService} from '../../../../../../tests/helpers/service-stubs';
import {expectCvaContract} from '../../../../../../tests/helpers/cva-harness';

describe('EnumSelectFieldComponent', () => {
	let component: EnumSelectFieldComponent;
	let fixture: ComponentFixture<EnumSelectFieldComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [EnumSelectFieldComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: ValidationSchemaService, useValue: stubValidationSchemaService()}]
		}).compileComponents();

		fixture = TestBed.createComponent(EnumSelectFieldComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('honors the ControlValueAccessor contract', () => {
		expectCvaContract(component);
	});

	describe('writeValue', () => {
		it('sets the control value without emitting', () => {
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.writeValue('foo');
			expect(component.control.value).toBe('foo');
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('registerOnChange', () => {
		it('fires on control value change', () => {
			fixture.detectChanges();
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.control.setValue('bar');
			expect(onChange).toHaveBeenCalledWith('bar');
		});
	});

	describe('setDisabledState', () => {
		it('toggles the control', () => {
			component.setDisabledState(true);
			expect(component.control.disabled).toBe(true);
			component.setDisabledState(false);
			expect(component.control.enabled).toBe(true);
		});
	});

	describe('required validator', () => {
		it('applies Validators.required on init when required', () => {
			component.required = true;
			fixture.detectChanges();
			expect(component.control.hasError('required')).toBe(true);
		});

		it('does not apply required when not required', () => {
			fixture.detectChanges();
			expect(component.control.hasError('required')).toBe(false);
		});
	});

	describe('filteredOptions', () => {
		it('drops empty and whitespace-only options', () => {
			component.options = ['a', '', '  ', 'b'];
			expect(component.filteredOptions).toEqual(['a', 'b']);
		});
	});

	describe('getOptionTranslationKey', () => {
		it('prefixes the translation path when present', () => {
			component.translationPath = 'choices.x';
			expect(component.getOptionTranslationKey('foo')).toBe('choices.x.foo');
		});

		it('returns the raw option when no path', () => {
			expect(component.getOptionTranslationKey('foo')).toBe('foo');
		});
	});

	describe('hasError / getErrorMessage', () => {
		it('hasError true only after touched/dirty', () => {
			component.required = true;
			fixture.detectChanges();
			expect(component.hasError('required')).toBe(false);
			component.control.markAsTouched();
			expect(component.hasError('required')).toBe(true);
		});

		it('returns the required message key', () => {
			component.required = true;
			fixture.detectChanges();
			expect(component.getErrorMessage()).toBe('modify.auth.form.validation.required');
		});
	});

	describe('template', () => {
		it('renders one mat-option per filtered option', () => {
			component.label = 'labels.foo';
			component.options = ['a', '', 'b', 'c'];
			fixture.detectChanges();
			const trigger = fixture.nativeElement.querySelector('mat-select');
			trigger.click();
			fixture.detectChanges();
			const options = document.querySelectorAll('mat-option');
			expect(options.length).toBe(3);
		});

		it('shows the recommended indicator when recommended and not required', () => {
			component.recommended = true;
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.recommended-indicator')).not.toBeNull();
		});

		it('hides the recommended indicator when required', () => {
			component.recommended = true;
			component.required = true;
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.recommended-indicator')).toBeNull();
		});
	});
});
