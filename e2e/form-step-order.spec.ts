import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installMultiTypeApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

/**
 * #225: hurni's agreed step order, verified against what the browser actually renders rather
 * than against the config file the app is compiled from.
 *
 * It also checks the order is *consistent* across the three data-product types: a section that
 * exists for several types must appear in the same relative position everywhere, so a user who
 * learns the dataset form is not surprised by the data-service form.
 */

const DATASET_ORDER = [
	'Basic Information',
	'Metadata & Versioning',
	'Access & Classification',
	'External References & Links',
	'Coverage & Legal',
	'Additional Metadata & Relationships',
	'Publisher & Contact',
	'Governance & Responsibility',
	'Distributions'
];

/** Relative order the shared sections must follow, whichever type is selected. */
const SHARED_BACKBONE = [
	'Basic Information',
	'Metadata & Versioning',
	'Access & Classification',
	'External References & Links',
	'Coverage & Legal',
	'Additional Metadata & Relationships',
	'Publisher & Contact',
	'Governance & Responsibility'
];

async function stepLabels(page: import('@playwright/test').Page): Promise<string[]> {
	const labels = await page.locator('.mat-step-header .mat-step-label').allInnerTexts();
	return labels.map(l => l.trim()).filter(Boolean);
}

async function selectType(page: import('@playwright/test').Page, type: string): Promise<string[]> {
	await page.locator('#productTypeSelect').selectOption(type);
	await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 15000});
	// Let the stepper re-render for the new type before reading it back.
	await page.waitForTimeout(500);
	return stepLabels(page);
}

test.describe('#225 form step order', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/modify/form?lang=en');
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
	});

	test('dataset renders exactly the agreed order', async ({page}) => {
		expect(await stepLabels(page)).toEqual(DATASET_ORDER);
	});

	test('shared sections keep the same relative order for every product type', async ({page}) => {
		for (const type of ['dataset', 'dataService', 'datasetSeries']) {
			const labels = await selectType(page, type);
			const backbone = labels.filter(l => SHARED_BACKBONE.includes(l));
			const expected = SHARED_BACKBONE.filter(l => labels.includes(l));
			expect(backbone, `relative order of shared sections for ${type}`).toEqual(expected);
		}
	});

	test('every type starts with Basic Information', async ({page}) => {
		for (const type of ['dataset', 'dataService', 'datasetSeries']) {
			const labels = await selectType(page, type);
			expect(labels[0], `first step for ${type}`).toBe('Basic Information');
		}
	});

	test('the type-specific section sits last, like Distributions does for a dataset', async ({page}) => {
		// Distributions / Service / Series is what makes each type distinct. hurni put Distributions
		// at the end for datasets, so the other two types place their counterpart there too.
		const cases: [string, string][] = [
			['dataset', 'Distributions'],
			['dataService', 'Service'],
			['datasetSeries', 'Series']
		];
		for (const [type, section] of cases) {
			const labels = await selectType(page, type);
			expect(labels.at(-1), `${section} position for ${type}`).toBe(section);
		}
	});

	test('no step is rendered empty or duplicated', async ({page}) => {
		for (const type of ['dataset', 'dataService', 'datasetSeries']) {
			const labels = await selectType(page, type);
			expect(new Set(labels).size, `duplicate step label for ${type}`).toBe(labels.length);
			expect(labels.length, `step count for ${type}`).toBeGreaterThan(3);
		}
	});

	test('every rendered label is translated, never a raw i18n key', async ({page}) => {
		// A missing labels.* entry renders the key itself (e.g. "labels.schema:image").
		for (const type of ['dataset', 'dataService', 'datasetSeries']) {
			await selectType(page, type);
			const texts = await page.evaluate(() =>
				Array.from(document.querySelectorAll('.mat-step-label, mat-label, .ob-form-label, label')).map(e => (e.textContent || '').trim())
			);
			const raw = texts.filter(t => /^(labels|modify|choices|i18n|ui)\./.test(t));
			expect(raw, `untranslated keys for ${type}`).toEqual([]);
		}
	});

	test('a field shared by several types lives in the same section everywhere', async ({page}) => {
		// schema:image used to sit in Basic Information for a dataset but in Additional Metadata
		// for the other two, which is exactly the inconsistency this check guards against.
		const sectionOf: Record<string, Record<string, string>> = {};
		for (const type of ['dataset', 'dataService', 'datasetSeries']) {
			await selectType(page, type);
			sectionOf[type] = await page.evaluate(() => {
				const map: Record<string, string> = {};
				document.querySelectorAll('.mat-step-header').forEach(header => {
					const section = (header.querySelector('.mat-step-label')?.textContent || '').trim();
					const contentId = header.getAttribute('aria-controls');
					const content = contentId ? document.getElementById(contentId) : null;
					content?.querySelectorAll('mat-label, .ob-form-label').forEach(l => {
						const text = (l.textContent || '').replace(/\s+/g, ' ').trim();
						if (text && !map[text]) map[text] = section;
					});
				});
				return map;
			});
		}

		const types = Object.keys(sectionOf);
		const conflicts: string[] = [];
		for (const field of new Set(types.flatMap(t => Object.keys(sectionOf[t])))) {
			const sections = new Set(types.filter(t => sectionOf[t][field]).map(t => sectionOf[t][field]));
			if (sections.size > 1) conflicts.push(`${field}: ${[...sections].join(' vs ')}`);
		}
		expect(conflicts, 'same field placed in different sections per type').toEqual([]);
	});
});
