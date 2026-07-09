import * as formLayout from '../codegen/form-layout.json';
// NB: do not name these `it`/`de`-style bare identifiers that collide with Jest globals —
// `import * as it` shadows Jest's `it()` and the whole suite fails to run.
import * as deJson from '../../assets/i18n/de.json';
import * as enJson from '../../assets/i18n/en.json';
import * as frJson from '../../assets/i18n/fr.json';
import * as itJson from '../../assets/i18n/it.json';
import {
	DATA_PRODUCT_TYPES,
	DATA_PRODUCT_TYPE_REGISTRY,
	DEFAULT_DATA_PRODUCT_TYPE,
	DataProductType,
	resolveDataProductType
} from './data-product-type';

const LOCALES: Record<string, any> = {de: deJson, en: enJson, fr: frJson, it: itJson};
const layout = formLayout as any;

describe('data-product-type registry', () => {
	it('registers exactly the three known types, defaulting to dataset', () => {
		expect(DATA_PRODUCT_TYPES).toEqual(['dataset', 'dataService', 'datasetSeries']);
		expect(DEFAULT_DATA_PRODUCT_TYPE).toBe('dataset');
	});

	it.each(DATA_PRODUCT_TYPES)('%s has a segment and schema path, and a form layout', type => {
		const config = DATA_PRODUCT_TYPE_REGISTRY[type];
		expect(config.segment).toBeTruthy();
		expect(config.schemaPath).toBe(`data/schemas/${type}.json`);
		expect(layout[type]?.steps?.length).toBeGreaterThan(0);
	});

	it('resolveDataProductType falls back to dataset for unknown/missing values', () => {
		expect(resolveDataProductType('dataService').type).toBe('dataService');
		expect(resolveDataProductType('nope' as DataProductType).type).toBe('dataset');
		expect(resolveDataProductType(null).type).toBe('dataset');
		expect(resolveDataProductType(undefined).type).toBe('dataset');
	});
});

/**
 * Enum choices are keyed by FIELD, not by product type: `choices.dataset.*` is the shared namespace.
 * Every enum field the non-dataset schemas carry (dct:accessRights, adms:status, dct:publisher,
 * dct:accrualPeriodicity) is shared with the dataset schema and uses identical codes, and the new
 * types will never introduce their own codes.
 *
 * These tests exist to stop a well-meaning "fix" that swaps modify.component.html's
 * `choices.dataset.<field>` for a per-type prefix: `choices.dataService.*` / `choices.datasetSeries.*`
 * do not exist in any locale, so that change would silently drop the labels those dropdowns render.
 */
describe('enum choices use a single shared namespace (#221)', () => {
	// Enum fields that appear in the dataService / datasetSeries schemas.
	const SHARED_ENUM_FIELDS = ['dct:accessRights', 'adms:status', 'dct:publisher', 'dct:accrualPeriodicity'];

	it('the registry carries no per-type i18n prefix', () => {
		for (const type of DATA_PRODUCT_TYPES) {
			expect(DATA_PRODUCT_TYPE_REGISTRY[type]).not.toHaveProperty('i18nPrefix');
		}
	});

	it.each(Object.keys(LOCALES))('%s defines no per-type choices namespace', locale => {
		const choices = LOCALES[locale].choices;
		expect(choices).toHaveProperty('dataset');
		expect(choices).not.toHaveProperty('dataService');
		expect(choices).not.toHaveProperty('datasetSeries');
	});

	it.each(Object.keys(LOCALES))('%s resolves every shared enum field under choices.dataset', locale => {
		const datasetChoices = LOCALES[locale].choices.dataset;
		for (const field of SHARED_ENUM_FIELDS) {
			expect(Object.keys(datasetChoices)).toContain(field);
		}
	});
});

describe('dataset form layout (#221)', () => {
	const datasetSteps = layout.dataset.steps as {key: string; fields: string[]}[];
	const allDatasetFields = datasetSteps.flatMap(step => step.fields);

	// Regression: dcatap:availability exists in the runtime schema but was dropped from every step,
	// so it round-tripped as a hidden control and a wrong value could never be corrected in the UI.
	it('exposes dcatap:availability as an editable field in the access step', () => {
		expect(allDatasetFields).toContain('dcatap:availability');
		expect(datasetSteps.find(step => step.key === 'access')?.fields).toContain('dcatap:availability');
	});

	it('keeps the issued/modified dates on the metadata step', () => {
		const metadata = datasetSteps.find(step => step.key === 'metadata');
		expect(metadata?.fields).toEqual(expect.arrayContaining(['dct:issued', 'dct:modified']));
	});

	it('only the dataset layout has a distributions step; containers have their own member step', () => {
		expect(datasetSteps.map(s => s.key)).toContain('distributions');
		expect((layout.dataService.steps as {key: string}[]).map(s => s.key)).not.toContain('distributions');
		expect((layout.datasetSeries.steps as {key: string}[]).map(s => s.key)).not.toContain('distributions');
	});
});
