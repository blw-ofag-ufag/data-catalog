import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';
import {ThemeSelectFieldComponent} from './theme-select-field.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';
import {I14YTheme, I14YThemeService} from '../../../../services/api/i14y-theme.service';
import {TranslateService} from '@ngx-translate/core';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubThemeService, stubTranslateService, stubValidationSchemaService} from '../../../../../../tests/helpers/service-stubs';
import {expectCvaContract} from '../../../../../../tests/helpers/cva-harness';

describe('ThemeSelectFieldComponent', () => {
	let component: ThemeSelectFieldComponent;
	let fixture: ComponentFixture<ThemeSelectFieldComponent>;

	const themes: I14YTheme[] = [
		{code: 'agriculture', labels: {de: 'Landwirtschaft', fr: 'Agriculture', it: 'Agricoltura', en: 'Agriculture'}},
		{code: 'energy', labels: {de: 'Energie', fr: 'Énergie', it: 'Energia', en: 'Energy'}}
	];

	function setup(t: I14YTheme[] = themes): void {
		const themeServiceStub = stubThemeService(t, {themes$: of(t)});
		TestBed.configureTestingModule({
			imports: [ThemeSelectFieldComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				{provide: ValidationSchemaService, useValue: stubValidationSchemaService()},
				{provide: I14YThemeService, useValue: themeServiceStub},
				{provide: TranslateService, useValue: stubTranslateService()}
			]
		});
		fixture = TestBed.createComponent(ThemeSelectFieldComponent);
		component = fixture.componentInstance;
	}

	it('should create', () => {
		setup();
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('honors the ControlValueAccessor contract', () => {
		setup();
		expectCvaContract(component);
	});

	it('subscribes to themes$ on init', () => {
		setup();
		fixture.detectChanges();
		expect(component.themes.length).toBe(2);
		expect(component.themes[0].code).toBe('agriculture');
	});

	describe('writeValue', () => {
		it('accepts an array of codes', () => {
			setup();
			component.writeValue(['agriculture', 'energy']);
			expect(component.control.value).toEqual(['agriculture', 'energy']);
		});

		it('wraps a single string into an array', () => {
			setup();
			component.writeValue('energy');
			expect(component.control.value).toEqual(['energy']);
		});

		it('resets to an empty array on null', () => {
			setup();
			component.writeValue(['energy']);
			component.writeValue(null);
			expect(component.control.value).toEqual([]);
		});

		it('does not emit when writing a value', () => {
			setup();
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.writeValue(['energy']);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('registerOnChange', () => {
		it('fires when the control changes', () => {
			setup();
			fixture.detectChanges();
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.control.setValue(['energy']);
			expect(onChange).toHaveBeenCalledWith(['energy']);
		});
	});

	describe('setDisabledState', () => {
		it('toggles the control', () => {
			setup();
			component.setDisabledState(true);
			expect(component.control.disabled).toBe(true);
			component.setDisabledState(false);
			expect(component.control.enabled).toBe(true);
		});
	});

	describe('required validator', () => {
		it('applies required on init when required', () => {
			setup();
			component.required = true;
			fixture.detectChanges();
			expect(component.control.hasError('required')).toBe(true);
		});
	});

	describe('label helpers', () => {
		it('getThemeLabel uses the current language (de)', () => {
			setup();
			fixture.detectChanges();
			expect(component.getThemeLabel(themes[0])).toBe('Landwirtschaft');
		});

		it('getSelectedThemesDisplay joins selected labels', () => {
			setup();
			fixture.detectChanges();
			component.control.setValue(['agriculture', 'energy']);
			expect(component.getSelectedThemesDisplay()).toBe('Landwirtschaft, Energie');
		});

		it('getSelectedThemesDisplay falls back to the code for unknown selections', () => {
			setup();
			fixture.detectChanges();
			component.control.setValue(['unknown']);
			expect(component.getSelectedThemesDisplay()).toBe('unknown');
		});
	});

	describe('getErrorMessage', () => {
		it('returns the required message key', () => {
			setup();
			component.required = true;
			fixture.detectChanges();
			expect(component.getErrorMessage()).toBe('modify.auth.form.validation.required');
		});
	});

	describe('template', () => {
		it('renders one mat-option per loaded theme', () => {
			setup();
			fixture.detectChanges();
			const matSelect = fixture.nativeElement.querySelector('mat-select');
			matSelect.click();
			fixture.detectChanges();
			const options = document.querySelectorAll('mat-option');
			expect(options.length).toBe(2);
		});
	});
});
