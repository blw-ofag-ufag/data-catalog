import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {FieldDebugOverlayComponent, FieldValidationDebugInfo} from './field-debug-overlay.component';
import {DebugService} from '../../../../services/debug.service';
import {TranslateService} from '@ngx-translate/core';
import {provideTranslateTesting} from '../../../../../../tests/helpers/translate-testing';
import {stubTranslateService} from '../../../../../../tests/helpers/service-stubs';

describe('FieldDebugOverlayComponent', () => {
	let component: FieldDebugOverlayComponent;
	let fixture: ComponentFixture<FieldDebugOverlayComponent>;
	let debugService: DebugService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FieldDebugOverlayComponent, NoopAnimationsModule, provideTranslateTesting()],
			providers: [{provide: TranslateService, useValue: stubTranslateService()}]
		}).compileComponents();

		fixture = TestBed.createComponent(FieldDebugOverlayComponent);
		component = fixture.componentInstance;
		debugService = TestBed.inject(DebugService);
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	describe('debug-gated rendering', () => {
		it('renders nothing when debug is disabled', () => {
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.field-debug-overlay')).toBeNull();
		});

		it('renders the overlay when debug is enabled', () => {
			debugService.toggleDebug();
			component.label = 'labels.dct:title';
			fixture.detectChanges();
			const pre = fixture.nativeElement.querySelector('.field-debug-overlay');
			expect(pre).not.toBeNull();
			expect(pre.textContent).toContain('i18n Label Key: labels.dct:title');
		});
	});

	describe('schemaField', () => {
		it('uses fieldName when provided', () => {
			component.fieldName = 'dct:title';
			component.label = 'labels.something-else';
			expect(component.schemaField).toBe('dct:title');
		});

		it('derives from a labels.* label when fieldName is missing', () => {
			component.label = 'labels.dct:title';
			expect(component.schemaField).toBe('dct:title');
		});

		it('returns the label as-is when no prefix and no fieldName', () => {
			component.label = 'plainLabel';
			expect(component.schemaField).toBe('plainLabel');
		});
	});

	describe('tooltipKey', () => {
		it('prefixes the schema field with tooltips.', () => {
			component.fieldName = 'dct:title';
			expect(component.tooltipKey).toBe('tooltips.dct:title');
		});
	});

	describe('getRequiredDisplay', () => {
		it('falls back to hardcoded Yes when required true and no schema info', () => {
			component.required = true;
			expect(component.getRequiredDisplay()).toBe('Yes [hardcoded]');
		});

		it('falls back to hardcoded No when required false', () => {
			component.required = false;
			expect(component.getRequiredDisplay()).toBe('No [hardcoded]');
		});

		it('returns dash when required is null', () => {
			component.required = null;
			expect(component.getRequiredDisplay()).toBe('-');
		});

		it('lists schemas requiring the field when schema info present', () => {
			component.validationInfo = {
				bySchema: [
					{schema: 'base', required: true, messages: []},
					{schema: 'i14y', required: false, messages: []}
				]
			};
			expect(component.getRequiredDisplay()).toBe('Yes (base)');
		});
	});

	describe('getValidationDisplay', () => {
		it('returns empty string when no validation info', () => {
			component.validationInfo = null;
			expect(component.getValidationDisplay()).toBe('');
		});

		it('renders schema and component messages', () => {
			const info: FieldValidationDebugInfo = {
				bySchema: [{schema: 'base', required: true, messages: [{text: 'must be set', source: 'schema'}]}],
				componentMessages: [{text: 'Required', source: 'hardcoded'}]
			};
			component.validationInfo = info;
			const display = component.getValidationDisplay();
			expect(display).toContain('Validation (base): must be set [schema]');
			expect(display).toContain('Validation (component): Required [hardcoded]');
		});

		it('formats translation source messages with their key', () => {
			component.validationInfo = {
				bySchema: [{schema: 'ods', required: false, messages: [{text: 'msg', source: 'translation', key: 'k.1'}]}]
			};
			expect(component.getValidationDisplay()).toContain('[translation: k.1]');
		});
	});

	describe('getEnglishLabel', () => {
		it('returns empty string for an empty label', () => {
			component.label = '';
			expect(component.getEnglishLabel()).toBe('');
		});

		it('falls back to the instant translation when no en catalog', () => {
			component.label = 'labels.dct:title';
			// stub instant echoes the key
			expect(component.getEnglishLabel()).toBe('labels.dct:title');
		});
	});
});
