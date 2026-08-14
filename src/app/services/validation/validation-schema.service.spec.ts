import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {ValidationSchemaService} from './validation-schema.service';
import {ValidationSchemaFetcherService} from './validation-schema-fetcher.service';
import {stubTranslateService} from '../../../../tests/helpers/service-stubs';

/**
 * Build a fetcher stub whose fetchAllSchemas emits a Map of <id> -> {config..., schema}
 * matching the raw JSON-schema shape the service expects to parse.
 */
function buildFetcherStub(): any {
	const baseSchema = {
		type: 'object',
		required: ['dct:title', 'dct:identifier'],
		recommended: ['dct:description'],
		properties: {
			'dct:identifier': {type: 'string'},
			'dct:title': {
				type: 'object',
				properties: {
					de: {type: 'string', pattern: '.{1,75}'},
					fr: {type: 'string'},
					it: {type: 'string'},
					en: {type: 'string'}
				},
				required: ['de', 'fr']
			},
			'dct:description': {type: 'object', properties: {de: {type: 'string'}, fr: {type: 'string'}}},
			'dcat:landingPage': {type: 'string', format: 'uri', minLength: 5, maxLength: 200, pattern: '^https?://.+'}
		}
	};

	const i14ySchema = {
		type: 'object',
		required: ['dcat:landingPage'],
		properties: {
			'dcat:landingPage': {type: 'string', format: 'uri'}
		}
	};

	const odsSchema = {
		type: 'object',
		required: [],
		properties: {
			'dct:description': {type: 'object', properties: {de: {type: 'string'}}}
		}
	};

	const results = new Map<string, any>();
	results.set('base', {id: 'base', color: '#ff9800', alertType: 'warning', schema: baseSchema});
	results.set('i14y', {id: 'i14y', color: '#0066cc', alertType: 'info', schema: i14ySchema});
	results.set('ods', {id: 'ods', color: '#e91e63', alertType: 'warning', schema: odsSchema});

	// Per-type product schemas, fetched individually by loadBaseForType (#221).
	const seriesSchema = {
		type: 'object',
		required: ['dct:creator'],
		properties: {
			'dct:creator': {type: 'object', properties: {'prov:agent': {type: 'string'}}},
			'dct:title': {type: 'object', properties: {de: {type: 'string'}, fr: {type: 'string'}}, required: ['de', 'fr']}
		}
	};

	return {
		fetchAllSchemas: jest.fn().mockReturnValue(of(results)),
		fetchSchema: jest.fn((config: any) => of(config.path?.includes('datasetSeries') ? seriesSchema : baseSchema))
	};
}

describe('ValidationSchemaService', () => {
	let service: ValidationSchemaService;
	let fetcher: any;

	beforeEach(() => {
		fetcher = buildFetcherStub();
		TestBed.configureTestingModule({
			providers: [
				ValidationSchemaService,
				{provide: ValidationSchemaFetcherService, useValue: fetcher},
				{provide: TranslateService, useValue: stubTranslateService()}
			]
		});
		service = TestBed.inject(ValidationSchemaService);
	});

	it('should be created and load schemas from the fetcher', () => {
		expect(service).toBeTruthy();
		expect(fetcher.fetchAllSchemas).toHaveBeenCalled();
	});

	describe('getSchema / getAllSchemas', () => {
		it('returns a parsed schema by type', () => {
			const base = service.getSchema('base');
			expect(base).toBeTruthy();
			expect(base?.id).toBe('base');
			expect(base?.color).toBe('#ff9800');
			expect(base?.alertType).toBe('warning');
		});

		it('returns undefined for an unknown schema type', () => {
			expect(service.getSchema('unknown' as any)).toBeUndefined();
		});

		it('returns all loaded schemas', () => {
			const all = service.getAllSchemas();
			expect(all.length).toBe(3);
			expect(all.map(s => s.id).sort()).toEqual(['base', 'i14y', 'ods']);
		});

		it('drops auto-generated dct:identifier from required fields', () => {
			const base = service.getSchema('base');
			// dct:identifier was filtered out of required before parsing,
			// so it must not be marked required.
			expect(base?.fields['dct:identifier']?.required).toBeFalsy();
			expect(base?.fields['dct:title']?.required).toBe(true);
		});
	});

	describe('getFieldValidation', () => {
		it('returns the validation rule for a known field', () => {
			const rule = service.getFieldValidation('base', 'dct:title');
			expect(rule).toBeTruthy();
			expect(rule?.required).toBe(true);
			expect(Array.isArray(rule?.validators)).toBe(true);
		});

		it('exposes pattern/min/max length from the schema property', () => {
			const rule = service.getFieldValidation('base', 'dcat:landingPage');
			expect(rule?.pattern).toBe('^https?://.+');
			expect(rule?.minLength).toBe(5);
			expect(rule?.maxLength).toBe(200);
		});

		it('returns undefined for an unknown field', () => {
			expect(service.getFieldValidation('base', 'does:notExist')).toBeUndefined();
		});

		it('returns undefined for an unknown schema', () => {
			expect(service.getFieldValidation('nope' as any, 'dct:title')).toBeUndefined();
		});
	});

	describe('isFieldRequired', () => {
		it('is true when required in any active schema', () => {
			expect(service.isFieldRequired('dct:title', ['base'])).toBe(true);
			expect(service.isFieldRequired('dcat:landingPage', ['i14y'])).toBe(true);
		});

		it('is true when required in at least one of several schemas', () => {
			expect(service.isFieldRequired('dcat:landingPage', ['base', 'i14y'])).toBe(true);
		});

		it('is false when not required in any active schema', () => {
			expect(service.isFieldRequired('dct:description', ['base', 'ods'])).toBe(false);
		});

		it('is false for an empty active-schema list', () => {
			expect(service.isFieldRequired('dct:title', [])).toBe(false);
		});
	});

	describe('getCombinedValidators', () => {
		it('combines validators across active schemas', () => {
			const validators = service.getCombinedValidators('dcat:landingPage', ['base', 'i14y']);
			expect(validators.length).toBeGreaterThan(0);
		});

		it('returns an empty array when the field is in no active schema', () => {
			expect(service.getCombinedValidators('totally:missing', ['base', 'i14y', 'ods'])).toEqual([]);
		});

		it('returns an empty array for an empty active-schema list', () => {
			expect(service.getCombinedValidators('dct:title', [])).toEqual([]);
		});
	});

	describe('getFieldDebugInfo', () => {
		it('reports per-schema entries for all three schema types', () => {
			const info = service.getFieldDebugInfo('dct:title');
			expect(info.bySchema.map(s => s.schema)).toEqual(['base', 'i14y', 'ods']);
		});

		it('marks a required field as required with a "Field is required" message', () => {
			const info = service.getFieldDebugInfo('dct:title');
			const baseEntry = info.bySchema.find(s => s.schema === 'base');
			expect(baseEntry?.required).toBe(true);
			expect(baseEntry?.messages.some(m => m.text === 'Field is required')).toBe(true);
		});

		it('includes pattern and length messages when present', () => {
			const info = service.getFieldDebugInfo('dcat:landingPage');
			const baseEntry = info.bySchema.find(s => s.schema === 'base');
			const texts = baseEntry?.messages.map(m => m.text) ?? [];
			expect(texts.some(t => t.startsWith('Pattern:'))).toBe(true);
			expect(texts.some(t => t.startsWith('Min length:'))).toBe(true);
			expect(texts.some(t => t.startsWith('Max length:'))).toBe(true);
		});

		it('reports not-required with no messages for an unknown field', () => {
			const info = service.getFieldDebugInfo('does:notExist');
			info.bySchema.forEach(entry => {
				expect(entry.required).toBe(false);
				expect(entry.messages).toEqual([]);
			});
		});
	});

	describe('loadBaseForType (#221)', () => {
		it("repoints the base slot at the requested type's own schema", () => {
			service.loadBaseForType('datasetSeries');

			const base = service.getSchema('base');
			// The dataset requirement dct:title stays; the series-only requirement appears.
			expect(base?.fields['dct:creator']?.required).toBe(true);
			expect(fetcher.fetchSchema).toHaveBeenCalledWith(expect.objectContaining({path: 'data/schemas/datasetSeries.json'}));
		});

		it('does not refetch when the base already matches the requested type', () => {
			service.loadBaseForType('dataset');
			expect(fetcher.fetchSchema).not.toHaveBeenCalled();
		});
	});

	describe('observables', () => {
		it('isLoaded() emits true once schemas have loaded', async () => {
			await expect(firstValueFrom(service.isLoaded())).resolves.toBe(true);
		});

		it('getLoadError() emits null on a successful load', async () => {
			await expect(firstValueFrom(service.getLoadError())).resolves.toBeNull();
		});
	});

	describe('error handling', () => {
		it('falls back to a minimal base schema and surfaces a load error when the fetcher fails', async () => {
			const failingFetcher: any = {
				fetchAllSchemas: jest.fn().mockReturnValue(new (require('rxjs').Observable)((observer: any) => observer.error(new Error('boom'))))
			};
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					ValidationSchemaService,
					{provide: ValidationSchemaFetcherService, useValue: failingFetcher},
					{provide: TranslateService, useValue: stubTranslateService()}
				]
			});
			const failed = TestBed.inject(ValidationSchemaService);

			expect(failed.getSchema('base')).toBeTruthy();
			expect(failed.getSchema('base')?.fields).toEqual({});
			await expect(firstValueFrom(failed.isLoaded())).resolves.toBe(true);
			await expect(firstValueFrom(failed.getLoadError())).resolves.not.toBeNull();
		});
	});
});
