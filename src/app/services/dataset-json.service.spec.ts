import {DatasetJsonService} from './dataset-json.service';

describe('DatasetJsonService', () => {
	let service: DatasetJsonService;

	beforeEach(() => {
		service = new DatasetJsonService();
	});

	it('serializes a Date value (e.g. dct:issued) to a YYYY-MM-DD string instead of dropping it', () => {
		const json = service.generateDatasetJson({
			'dct:identifier': 'test-id',
			'dct:issued': new Date(2024, 0, 5) // 5 Jan 2024, local time
		});

		expect(json['dct:issued']).toBe('2024-01-05');
	});

	it('uses local date parts so the day is not shifted by timezone', () => {
		// A late-evening local time would roll back a day under UTC/toISOString.
		const json = service.generateDatasetJson({
			'dct:identifier': 'test-id',
			'dct:issued': new Date(2024, 11, 31, 23, 30, 0)
		});

		expect(json['dct:issued']).toBe('2024-12-31');
	});

	it('persists dcatap:availability when set', () => {
		const json = service.generateDatasetJson({
			'dct:identifier': 'test-id',
			'dcatap:availability': 'STABLE'
		});

		expect(json['dcatap:availability']).toBe('STABLE');
	});

	it('still removes empty string and null values', () => {
		const json = service.generateDatasetJson({
			'dct:identifier': 'test-id',
			'dcatap:availability': '',
			'dct:issued': null
		});

		expect(json.hasOwnProperty('dcatap:availability')).toBe(false);
		expect(json.hasOwnProperty('dct:issued')).toBe(false);
	});

	// Issue #260 class: these fields are `array` of `string` in the schema, but the edit form binds
	// each to a single text input, so typing in one turns the value into a bare string.
	describe('array-of-string fields keep the schema shape (#260)', () => {
		it.each(['prov:wasDerivedFrom', 'prov:wasGeneratedBy', 'dcat:inSeries', 'dct:replaces'])(
			'wraps a typed scalar for %s into an array',
			field => {
				const json = service.generateDatasetJson({'dct:identifier': 'test-id', [field]: 'AGIS'} as any);
				expect((json as any)[field]).toEqual(['AGIS']);
			}
		);

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

		it('does not mutate the caller\'s form value', () => {
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
});
