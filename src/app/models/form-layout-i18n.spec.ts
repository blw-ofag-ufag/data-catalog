import formLayout from '../codegen/form-layout.json';
import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import fr from '../../assets/i18n/fr.json';
import itIt from '../../assets/i18n/it.json';

/**
 * The form layout is the list of fields the edit form actually renders, so every field in it
 * needs a label in every language. A missing key silently renders the raw translation key
 * (e.g. "labels.schema:image") in the form, which is what a browser pass through #225 caught.
 */
describe('form layout i18n coverage', () => {
	type Bundle = {labels: Record<string, string>} & Record<string, unknown>;

	const languages: [string, Bundle][] = [
		['de', de],
		['en', en],
		['fr', fr],
		['it', itIt]
	];

	const layout = formLayout as Record<string, {steps: {key: string; label: string; fields: string[]}[]}>;
	const productTypes = Object.keys(layout);

	const allFields = Array.from(new Set(productTypes.flatMap(type => layout[type].steps.flatMap(step => step.fields))));

	const allStepLabels = Array.from(new Set(productTypes.flatMap(type => layout[type].steps.map(step => step.label))));

	function lookup(bundle: Bundle, dottedKey: string): unknown {
		return dottedKey.split('.').reduce<unknown>((node, part) => (node == null ? undefined : (node as Record<string, unknown>)[part]), bundle);
	}

	it('covers at least the three known product types', () => {
		expect(productTypes).toEqual(expect.arrayContaining(['dataset', 'dataService', 'datasetSeries']));
	});

	describe.each(languages)('%s', (_lang, bundle) => {
		it.each(allFields)('has a label for %s', field => {
			expect(bundle.labels[field]).toBeDefined();
		});

		it.each(allStepLabels)('has a section title for %s', label => {
			expect(lookup(bundle, label)).toBeDefined();
		});
	});
});
