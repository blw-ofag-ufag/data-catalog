import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installMultiTypeApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

// Edit flow per type: open the type's detail page, click Edit, and assert the modify form loads the
// record AS ITS OWN TYPE — the correct per-type steps render and the product type is read-only.
// Previously these only checked that "some input" was visible, which passed even though the form was
// hardcoded to dataset (#221).

async function openDetailAndEdit(page: any, id: string, type: string, heading: RegExp) {
	await page.goto(`/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=${id}&type=${type}`);
	await expect(page.getByRole('heading', {name: heading})).toBeVisible({timeout: 30000});
	await page.getByRole('button', {name: /edit/i}).first().click();
	await expect.poll(() => page.url()).toContain('/modify');
	await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
}

test.describe('Edit Dataset', () => {
	test.beforeEach(async ({context}) => installMultiTypeApiMocks(context));

	test('loads the dataset form with the Distributions step, type read-only', async ({page}) => {
		await openDetailAndEdit(page, 'ds-001', 'dataset', /Apple Harvest Statistics EN/i);
		await expect(page.locator('.mat-step-header', {hasText: 'Distributions'})).toBeVisible();
		// In edit mode the product type is fixed — no selector.
		await expect(page.locator('#productTypeSelect')).toHaveCount(0);
	});
});

test.describe('Edit DataService', () => {
	test.beforeEach(async ({context}) => installMultiTypeApiMocks(context));

	test('loads the dataService form with the Service step, no Distributions', async ({page}) => {
		await openDetailAndEdit(page, 'ds-service-001', 'dataService', /Apple API Service EN/i);
		await expect(page.locator('.mat-step-header', {hasText: 'Service'})).toBeVisible();
		await expect(page.locator('.mat-step-header', {hasText: 'Distributions'})).toHaveCount(0);
		await expect(page.locator('#productTypeSelect')).toHaveCount(0);
	});

	test('served datasets render as a picker (Add Dataset tile + existing member), not a text field', async ({page}) => {
		await openDetailAndEdit(page, 'ds-service-001', 'dataService', /Apple API Service EN/i);
		await page.locator('.mat-step-header', {hasText: 'Service'}).click();
		await expect(page.locator('app-dataset-picker-field')).toBeVisible();
		await expect(page.getByRole('button', {name: /Add Dataset/i})).toBeVisible();
		// The served dataset (ds-001) shows as a tile inside the picker.
		await expect(page.locator('app-dataset-picker-field').getByText('Apple Harvest Statistics EN')).toBeVisible();
	});
});

test.describe('Edit DatasetSeries', () => {
	test.beforeEach(async ({context}) => installMultiTypeApiMocks(context));

	test('loads the datasetSeries form with the Series step, no Distributions', async ({page}) => {
		await openDetailAndEdit(page, 'ds-series-001', 'datasetSeries', /Apple Harvest Time Series EN/i);
		await expect(page.locator('.mat-step-header', {hasText: 'Series'})).toBeVisible();
		await expect(page.locator('.mat-step-header', {hasText: 'Distributions'})).toHaveCount(0);
		await expect(page.locator('#productTypeSelect')).toHaveCount(0);
	});

	test('member datasets render as a picker (Add Dataset tile + existing member), not a text field', async ({page}) => {
		await openDetailAndEdit(page, 'ds-series-001', 'datasetSeries', /Apple Harvest Time Series EN/i);
		await page.locator('.mat-step-header', {hasText: 'Series'}).click();
		await expect(page.locator('app-dataset-picker-field')).toBeVisible();
		await expect(page.getByRole('button', {name: /Add Dataset/i})).toBeVisible();
		await expect(page.locator('app-dataset-picker-field').getByText('Apple Harvest Statistics EN')).toBeVisible();
	});
});
