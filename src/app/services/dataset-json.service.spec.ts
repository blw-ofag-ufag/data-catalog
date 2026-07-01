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
});
