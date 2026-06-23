import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {MultilingualTextFieldComponent} from './multilingual-text-field.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubValidationSchemaService} from '../../../../../../tests/helpers/service-stubs';
import {expectCvaContract} from '../../../../../../tests/helpers/cva-harness';

describe('MultilingualTextFieldComponent', () => {
	let component: MultilingualTextFieldComponent;
	let fixture: ComponentFixture<MultilingualTextFieldComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MultilingualTextFieldComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: ValidationSchemaService, useValue: stubValidationSchemaService()}]
		}).compileComponents();

		fixture = TestBed.createComponent(MultilingualTextFieldComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('honors the ControlValueAccessor contract', () => {
		expectCvaContract(component);
	});

	it('writeValue patches the language form group', () => {
		component.writeValue({de: 'Hallo', fr: 'Bonjour', it: '', en: ''});
		expect(component.getControl('de').value).toBe('Hallo');
		expect(component.getControl('fr').value).toBe('Bonjour');
	});

	it('writeValue(null) resets the form group', () => {
		component.writeValue({de: 'x', fr: 'y', it: '', en: ''});
		component.writeValue(null);
		expect(component.getControl('de').value).toBeNull();
	});

	it('registerOnChange fires when a language value changes', () => {
		const onChange = jest.fn();
		component.registerOnChange(onChange);
		component.getControl('de').setValue('neu');
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({de: 'neu'}));
	});

	it('onBlur notifies touched', () => {
		const onTouched = jest.fn();
		component.registerOnTouched(onTouched);
		component.onBlur();
		expect(onTouched).toHaveBeenCalled();
	});

	it('setDisabledState toggles the form group', () => {
		component.setDisabledState(true);
		expect(component.formGroup.disabled).toBe(true);
		component.setDisabledState(false);
		expect(component.formGroup.enabled).toBe(true);
	});

	describe('required-language validation', () => {
		it('marks de and fr required when requiredLanguages = [de, fr]', () => {
			component.requiredLanguages = ['de', 'fr'];
			fixture.detectChanges();
			expect(component.getControl('de').hasError('required')).toBe(true);
			expect(component.getControl('fr').hasError('required')).toBe(true);
			expect(component.getControl('it').hasError('required')).toBe(false);
		});

		it('isLanguageRequired reflects requiredLanguages and the required flag', () => {
			component.requiredLanguages = ['it'];
			component.required = true;
			expect(component.isLanguageRequired('it')).toBe(true);
			expect(component.isLanguageRequired('de')).toBe(true); // required => de/fr
			expect(component.isLanguageRequired('en')).toBe(false);
		});

		it('validate() reports per-language errors when a required language is empty', () => {
			component.requiredLanguages = ['de', 'fr'];
			fixture.detectChanges();
			const errors = component.validate({} as any);
			expect(errors).toEqual({deRequired: true, frRequired: true});
		});

		it('validate() returns null when required languages are filled', () => {
			component.requiredLanguages = ['de', 'fr'];
			fixture.detectChanges();
			component.getControl('de').setValue('a');
			component.getControl('fr').setValue('b');
			expect(component.validate({} as any)).toBeNull();
		});
	});

	describe('getErrorMessage', () => {
		it('returns the required key', () => {
			component.requiredLanguages = ['de'];
			fixture.detectChanges();
			expect(component.getErrorMessage('de')).toBe('modify.auth.form.validation.required');
		});

		it('returns the maxLength key', () => {
			component.maxLength = 3;
			fixture.detectChanges();
			component.getControl('de').setValue('toolong');
			expect(component.getErrorMessage('de')).toBe('modify.auth.form.validation.maxLength');
		});

		it('returns the title pattern key for title fields', () => {
			component.label = 'labels.dct:title';
			component.pattern = '[a-z]+';
			fixture.detectChanges();
			component.getControl('de').setValue('123');
			expect(component.getErrorMessage('de')).toBe('modify.auth.form.validation.titlePattern');
		});
	});

	describe('template', () => {
		it('renders a tab per language', () => {
			fixture.detectChanges();
			const tabs = fixture.nativeElement.querySelectorAll('.mat-mdc-tab');
			expect(tabs.length).toBe(4);
		});

		it('shows the de+fr hint and renders it after the tab group (develop layout)', () => {
			component.requiredLanguages = ['de', 'fr'];
			fixture.detectChanges();
			const help = fixture.nativeElement.querySelector('.field-help');
			const tabGroup = fixture.nativeElement.querySelector('mat-tab-group');
			expect(help.textContent).toContain('Mindestens Deutsch und Französisch sind erforderlich');
			// DOCUMENT_POSITION_FOLLOWING (4) => help comes after the tab group
			expect(tabGroup.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		});

		it('hides the help block when not required and no constraints', () => {
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.field-help')).toBeNull();
		});
	});
});
