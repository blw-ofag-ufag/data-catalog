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
});
