import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';
import {KeywordSelectFieldComponent} from './keyword-select-field.component';
import {ValidationSchemaService} from '../../../../services/validation/validation-schema.service';
import {KeywordService, Keyword} from '../../../../services/api/keyword.service';
import {TranslateService} from '@ngx-translate/core';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubValidationSchemaService, stubKeywordService, stubTranslateService} from '../../../../../../tests/helpers/service-stubs';
import {expectCvaContract} from '../../../../../../tests/helpers/cva-harness';

describe('KeywordSelectFieldComponent', () => {
	let component: KeywordSelectFieldComponent;
	let fixture: ComponentFixture<KeywordSelectFieldComponent>;

	const keywords: Keyword[] = [
		{code: 'kw-a', labels: {de: 'Schlagwort A', fr: 'A', it: 'A', en: 'Keyword A'}},
		{code: 'kw-b', labels: {de: 'Schlagwort B', fr: 'B', it: 'B', en: 'Keyword B'}}
	];

	function setup(kw: Keyword[] = keywords): void {
		const keywordServiceStub = stubKeywordService(kw, {keywords$: of(kw)});
		TestBed.configureTestingModule({
			imports: [KeywordSelectFieldComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [
				{provide: ValidationSchemaService, useValue: stubValidationSchemaService()},
				{provide: KeywordService, useValue: keywordServiceStub},
				{provide: TranslateService, useValue: stubTranslateService()}
			]
		});
		fixture = TestBed.createComponent(KeywordSelectFieldComponent);
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

	it('loads keywords from the service on init', () => {
		setup();
		fixture.detectChanges();
		expect(component.keywords.length).toBe(2);
		expect(component.keywords[0].code).toBe('kw-a');
	});

	describe('writeValue', () => {
		it('accepts an array of codes', () => {
			setup();
			component.writeValue(['kw-a', 'kw-b']);
			expect(component.control.value).toEqual(['kw-a', 'kw-b']);
		});

		it('wraps a single string into an array (backward compatibility)', () => {
			setup();
			component.writeValue('kw-a');
			expect(component.control.value).toEqual(['kw-a']);
		});

		it('resets to an empty array on null', () => {
			setup();
			component.writeValue(['kw-a']);
			component.writeValue(null);
			expect(component.control.value).toEqual([]);
		});

		it('does not emit when writing a value', () => {
			setup();
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.writeValue(['kw-a']);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('registerOnChange', () => {
		it('fires when the control changes', () => {
			setup();
			fixture.detectChanges();
			const onChange = jest.fn();
			component.registerOnChange(onChange);
			component.control.setValue(['kw-b']);
			expect(onChange).toHaveBeenCalledWith(['kw-b']);
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
		it('getKeywordLabel uses the current language (de)', () => {
			setup();
			fixture.detectChanges();
			expect(component.getKeywordLabel(keywords[0])).toBe('Schlagwort A');
		});

		it('getSelectedKeywordsDisplay joins selected labels', () => {
			setup();
			fixture.detectChanges();
			component.control.setValue(['kw-a', 'kw-b']);
			expect(component.getSelectedKeywordsDisplay()).toBe('Schlagwort A, Schlagwort B');
		});

		it('getSelectedKeywordsDisplay falls back to the code for unknown selections', () => {
			setup();
			fixture.detectChanges();
			component.control.setValue(['unknown']);
			expect(component.getSelectedKeywordsDisplay()).toBe('unknown');
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
		it('renders one mat-option per loaded keyword', () => {
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
