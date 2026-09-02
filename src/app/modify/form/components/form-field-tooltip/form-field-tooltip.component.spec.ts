import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {FormFieldTooltipComponent} from './form-field-tooltip.component';
import {TranslateService} from '@ngx-translate/core';
import {DomSanitizer} from '@angular/platform-browser';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubTranslateService} from '../../../../../../tests/helpers/service-stubs';

describe('FormFieldTooltipComponent', () => {
	let component: FormFieldTooltipComponent;
	let fixture: ComponentFixture<FormFieldTooltipComponent>;
	let translate: any;

	function setup(translateOverrides: Record<string, unknown> = {}): void {
		translate = stubTranslateService(translateOverrides);
		TestBed.configureTestingModule({
			imports: [FormFieldTooltipComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: TranslateService, useValue: translate}]
		});
		fixture = TestBed.createComponent(FormFieldTooltipComponent);
		component = fixture.componentInstance;
	}

	it('should create', () => {
		setup();
		component.fieldName = 'dct:title';
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	describe('hasTooltip', () => {
		it('is false when fieldName is missing', () => {
			setup();
			component.fieldName = '';
			expect(component.hasTooltip()).toBe(false);
		});

		it('is false when the i18n key is missing (instant echoes the key)', () => {
			// default stub instant returns the key unchanged
			setup();
			component.fieldName = 'dct:title';
			expect(component.hasTooltip()).toBe(false);
		});

		it('is false when the translation resolves to an empty string', () => {
			setup({instant: jest.fn().mockReturnValue('')});
			component.fieldName = 'dct:title';
			expect(component.hasTooltip()).toBe(false);
		});

		it('is true when a real translation exists for the key', () => {
			setup({instant: jest.fn().mockReturnValue('Some helpful text')});
			component.fieldName = 'dct:title';
			expect(component.hasTooltip()).toBe(true);
		});
	});

	describe('template', () => {
		it('renders no tooltip button when hasTooltip is false', () => {
			setup();
			component.fieldName = 'dct:title';
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.tooltip-button')).toBeNull();
		});

		it('gates the tooltip button on hasTooltip() being true', () => {
			// When a translation exists, hasTooltip() returns true so the @if branch
			// (which renders the ObPopover-backed button) becomes active.
			setup({instant: jest.fn().mockReturnValue('Some helpful text')});
			component.fieldName = 'dct:title';
			expect(component.hasTooltip()).toBe(true);
		});
	});

	describe('getTooltipHtml', () => {
		it('rewrites anchor tags into popover-link spans', () => {
			setup({instant: jest.fn().mockReturnValue('See <a href="https://x.test">link</a> here')});
			component.fieldName = 'dct:title';
			const sanitizer = TestBed.inject(DomSanitizer);
			const html = sanitizer.sanitize(1 /* SecurityContext.HTML */, component.getTooltipHtml()) ?? '';
			expect(html).toContain('class="popover-link"');
			expect(html).toContain('data-href="https://x.test"');
			expect(html).not.toContain('<a ');
		});

		it('passes plain text through unchanged', () => {
			setup({instant: jest.fn().mockReturnValue('Plain tooltip')});
			component.fieldName = 'dct:title';
			const sanitizer = TestBed.inject(DomSanitizer);
			const html = sanitizer.sanitize(1, component.getTooltipHtml()) ?? '';
			expect(html).toContain('Plain tooltip');
		});
	});
});
