import {TestBed} from '@angular/core/testing';
import {DatasetJsonService} from './dataset-json.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('DatasetJsonService', () => {
	let service: DatasetJsonService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(DatasetJsonService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('generateDatasetJson', () => {
		it('auto-generates a v4 identifier when missing', () => {
			const result = service.generateDatasetJson({'dct:title': {de: 'Titel', fr: 'Titre'}});
			expect(result['dct:identifier']).toMatch(UUID_RE);
		});

		it('keeps an explicit identifier', () => {
			const result = service.generateDatasetJson({'dct:identifier': 'my-id', 'dct:title': {de: 'x', fr: 'y'}});
			expect(result['dct:identifier']).toBe('my-id');
		});

		it('auto-generates an identifier for each distribution that lacks one', () => {
			const result: any = service.generateDatasetJson({
				'dct:title': {de: 'a', fr: 'b'},
				'dcat:distribution': [{'dcat:accessURL': 'https://example.com/a'}, {'dct:identifier': 'keep', 'dcat:accessURL': 'https://example.com/b'}]
			});
			expect(result['dcat:distribution'][0]['dct:identifier']).toMatch(UUID_RE);
			expect(result['dcat:distribution'][1]['dct:identifier']).toBe('keep');
		});

		it('places dct:identifier as the first property', () => {
			const result = service.generateDatasetJson({'dct:title': {de: 'a', fr: 'b'}, 'dct:identifier': 'id-1'});
			expect(Object.keys(result)[0]).toBe('dct:identifier');
		});

		it('orders known properties per the preferred order', () => {
			const result = service.generateDatasetJson({
				'dcat:distribution': [{'dct:identifier': 'd', 'dcat:accessURL': 'https://x/y'}],
				'dct:title': {de: 'a', fr: 'b'},
				'dct:identifier': 'id'
			});
			const keys = Object.keys(result);
			expect(keys.indexOf('dct:title')).toBeLessThan(keys.indexOf('dcat:distribution'));
		});

		it('drops empty strings, empty arrays and null values', () => {
			const result: any = service.generateDatasetJson({
				'dct:identifier': 'id',
				'dct:title': {de: 'a', fr: 'b'},
				'dcat:version': '',
				'dcat:keyword': [],
				'dct:spatial': null
			});
			expect(result['dcat:version']).toBeUndefined();
			expect(result['dcat:keyword']).toBeUndefined();
			expect(result['dct:spatial']).toBeUndefined();
		});

		it('keeps a multilingual field when at least one language has content', () => {
			const result: any = service.generateDatasetJson({'dct:identifier': 'id', 'dct:title': {de: 'Titel', fr: '', it: '', en: ''}});
			expect(result['dct:title']).toEqual({de: 'Titel'});
		});

		it('drops a multilingual field when every language is empty', () => {
			const result: any = service.generateDatasetJson({'dct:identifier': 'id', 'dct:title': {de: '', fr: '', it: '', en: ''}});
			expect(result['dct:title']).toBeUndefined();
		});

		// Date handling (develop #264/#259): datepicker Date values must serialize as YYYY-MM-DD
		// (local parts) instead of being dropped or timezone-shifted.
		it('serializes a Date value (e.g. dct:issued) to a YYYY-MM-DD string instead of dropping it', () => {
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', 'dct:issued': new Date(2024, 0, 5)});
			expect(json['dct:issued']).toBe('2024-01-05');
		});

		it('uses local date parts so the day is not shifted by timezone', () => {
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', 'dct:issued': new Date(2024, 11, 31, 23, 30, 0)});
			expect(json['dct:issued']).toBe('2024-12-31');
		});

		it('persists dcatap:availability when set', () => {
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', 'dcatap:availability': 'STABLE'});
			expect(json['dcatap:availability']).toBe('STABLE');
		});

		// Issue #259 asked why dct:modified goes missing. This is intended: unlike dct:issued it is
		// not a schema-required field (only recommended), so a blank value is omitted rather than
		// written as null/"". A value that IS set must always survive.
		it('omits dct:modified when blank, but keeps dct:issued', () => {
			const json = service.generateDatasetJson({
				'dct:identifier': 'test-id',
				'dct:issued': new Date(2026, 6, 2),
				'dct:modified': null
			});
			expect(json['dct:issued']).toBe('2026-07-02');
			expect(json).not.toHaveProperty('dct:modified');
		});

		it.each([
			['a Date', new Date(2026, 6, 5), '2026-07-05'],
			['a date-only string', '2026-07-05', '2026-07-05']
		])('keeps dct:modified when set as %s', (_label, value, expected) => {
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', 'dct:modified': value});
			expect(json['dct:modified']).toBe(expected);
		});
	});

	describe('generateUUID (via generated identifiers)', () => {
		it('produces unique identifiers across calls', () => {
			const a = service.generateDatasetJson({'dct:title': {de: 'a', fr: 'b'}})['dct:identifier'];
			const b = service.generateDatasetJson({'dct:title': {de: 'a', fr: 'b'}})['dct:identifier'];
			expect(a).not.toBe(b);
		});
	});

	describe('helpers', () => {
		it('generateFilePath builds the dataset path', () => {
			expect(service.generateFilePath('abc')).toBe('data/raw/datasets/abc.json');
		});

		it('generateFilePath uses the per-type folder segment', () => {
			expect(service.generateFilePath('abc', 'dataService')).toBe('data/raw/dataServices/abc.json');
			expect(service.generateFilePath('abc', 'datasetSeries')).toBe('data/raw/datasetSeries/abc.json');
		});

		it('formatJsonForDisplay pretty-prints with 2-space indent', () => {
			expect(service.formatJsonForDisplay({a: 1})).toBe('{\n  "a": 1\n}');
		});

		it('createJsonBlob returns an application/json blob', () => {
			const blob = service.createJsonBlob({a: 1});
			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe('application/json');
		});
	});

	// Issue #260 class: these fields are `array` of `string` in the schema, but the edit form binds
	// each to a single text input, so typing in one turns the value into a bare string.
	describe('array-of-string fields keep the schema shape (#260)', () => {
		it.each(['prov:wasDerivedFrom', 'prov:wasGeneratedBy', 'dcat:inSeries', 'dct:replaces'])('wraps a typed scalar for %s into an array', field => {
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', [field]: 'AGIS'} as any);
			expect((json as any)[field]).toEqual(['AGIS']);
		});

		it('splits the comma-separated text Angular renders for a multi-valued array', () => {
			// A text input bound to ['a','b','c'] displays "a,b,c"; editing it yields that string back.
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', 'prov:wasDerivedFrom': 'AGIS, GELAN ,ISVET'});
			expect(json['prov:wasDerivedFrom']).toEqual(['AGIS', 'GELAN', 'ISVET']);
		});

		it('leaves an untouched array alone', () => {
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', 'prov:wasDerivedFrom': ['AGIS', 'GELAN']});
			expect(json['prov:wasDerivedFrom']).toEqual(['AGIS', 'GELAN']);
		});

		it('drops the field when the text is blank', () => {
			const json = service.generateDatasetJson({'dct:identifier': 'test-id', 'dcat:inSeries': '  '});
			expect(json.hasOwnProperty('dcat:inSeries')).toBe(false);
		});

		it("does not mutate the caller's form value", () => {
			const formValue: any = {'dct:identifier': 'test-id', 'prov:wasGeneratedBy': 'Datenportal'};
			service.generateDatasetJson(formValue);
			expect(formValue['prov:wasGeneratedBy']).toBe('Datenportal');
		});
	});

	describe('bv:externalCatalogs is written as objects (#260)', () => {
		it('preserves the object shape and the externally-assigned dct:identifier', () => {
			const json = service.generateDatasetJson({
				'dct:identifier': 'test-id',
				'bv:externalCatalogs': [{'dcat:catalog': 'I14Y', 'dct:identifier': 'admin-dataset-12345'}]
			});

			expect(json['bv:externalCatalogs']).toEqual([{'dcat:catalog': 'I14Y', 'dct:identifier': 'admin-dataset-12345'}]);
		});

		it('drops a blank dct:identifier rather than emitting it (additionalProperties is false, the key is optional)', () => {
			const json = service.generateDatasetJson({
				'dct:identifier': 'test-id',
				'bv:externalCatalogs': [{'dcat:catalog': 'I14Y', 'dct:identifier': ''}]
			});

			expect(json['bv:externalCatalogs']).toEqual([{'dcat:catalog': 'I14Y'}]);
		});
	});

	describe('fields the schema no longer declares survive an edit (#284)', () => {
		// The form builds its controls from the runtime schema, so a record field the schema dropped
		// gets no control and never reaches formData. bv:itSystem is the live case: removed from the
		// schema, still present on 23 published records.
		it('keeps a base-record field that the form has no control for', () => {
			const json: any = service.generateDatasetJson(
				{'dct:identifier': 'test-id', 'dct:title': {de: 'Titel'}},
				{'dct:identifier': 'test-id', 'bv:itSystem': 'https://agis.admin.ch', 'dct:title': {de: 'alt'}}
			);

			expect(json['bv:itSystem']).toBe('https://agis.admin.ch');
		});

		it('lets the form win over the base for every field the form does control', () => {
			const json: any = service.generateDatasetJson(
				{'dct:identifier': 'test-id', 'dct:title': {de: 'neu'}},
				{'dct:identifier': 'test-id', 'dct:title': {de: 'alt'}}
			);

			expect(json['dct:title']).toEqual({de: 'neu'});
		});

		it('still clears a field the user emptied, rather than resurrecting it from the base', () => {
			const json: any = service.generateDatasetJson({'dct:identifier': 'test-id', 'dcat:version': ''}, {'dct:identifier': 'test-id', 'dcat:version': '1.0.0'});

			expect(json['dcat:version']).toBeUndefined();
		});

		it('defaults to no base, so creating a record cannot inherit anything', () => {
			const json: any = service.generateDatasetJson({'dct:identifier': 'test-id', 'dct:title': {de: 'x'}});

			expect(Object.keys(json)).toEqual(['dct:identifier', 'dct:title']);
		});

		it('does not mutate either argument', () => {
			const formData = {'dct:identifier': 'test-id', 'dcat:distribution': [{'dct:title': {de: 'd'}}]};
			const base = {'dct:identifier': 'test-id', 'bv:itSystem': 'x'};

			service.generateDatasetJson(formData, base);

			expect(formData).toEqual({'dct:identifier': 'test-id', 'dcat:distribution': [{'dct:title': {de: 'd'}}]});
			expect(base).toEqual({'dct:identifier': 'test-id', 'bv:itSystem': 'x'});
		});
	});
});
