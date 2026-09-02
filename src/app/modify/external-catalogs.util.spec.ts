import {normalizeExternalCatalogs} from './external-catalogs.util';

describe('normalizeExternalCatalogs (issue #260)', () => {
	it('keeps object entries and their externally-assigned dct:identifier', () => {
		const value = [
			{'dcat:catalog': 'I14Y', 'dct:identifier': 'admin-dataset-12345'},
			{'dcat:catalog': 'opendata.swiss', 'dct:identifier': '001-992-334'}
		];

		expect(normalizeExternalCatalogs(value)).toEqual(value);
	});

	// The pre-fix form wrote ["I14Y", "opendata.swiss"]. Such records exist upstream, so loading
	// one must not blow up or silently drop its catalogs.
	it('upgrades legacy bare-string entries to the schema shape', () => {
		expect(normalizeExternalCatalogs(['I14Y', 'opendata.swiss'])).toEqual([
			{'dcat:catalog': 'I14Y', 'dct:identifier': ''},
			{'dcat:catalog': 'opendata.swiss', 'dct:identifier': ''}
		]);
	});

	it('handles a mixed array of both shapes', () => {
		expect(normalizeExternalCatalogs(['I14Y', {'dcat:catalog': 'geocat.ch', 'dct:identifier': 'g-1'}])).toEqual([
			{'dcat:catalog': 'I14Y', 'dct:identifier': ''},
			{'dcat:catalog': 'geocat.ch', 'dct:identifier': 'g-1'}
		]);
	});

	it('defaults a missing dct:identifier to an empty string', () => {
		expect(normalizeExternalCatalogs([{'dcat:catalog': 'I14Y'}])).toEqual([{'dcat:catalog': 'I14Y', 'dct:identifier': ''}]);
	});

	it.each([
		['a non-array', 'I14Y'],
		['null', null],
		['undefined', undefined],
		['an empty array', []]
	])('yields no entries for %s', (_label, value) => {
		expect(normalizeExternalCatalogs(value)).toEqual([]);
	});

	it.each([
		['an entry without a catalog name', [{'dct:identifier': 'orphan'}]],
		['a blank string entry', ['   ']],
		['a blank catalog name', [{'dcat:catalog': ''}]],
		['a null entry', [null]]
	])('drops %s', (_label, value) => {
		expect(normalizeExternalCatalogs(value)).toEqual([]);
	});
});
