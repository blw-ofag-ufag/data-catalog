import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installMultiTypeApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

// The create form is now a dynamic stepper driven by the selected product type's layout + schema.
// These tests assert that picking a type actually re-renders the stepper with THAT type's steps
// (not the dataset steps) — the previous suite only checked that "some select" existed (#221).

test.describe('Create form — dynamic per-type stepper', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/modify/form?lang=en');
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
	});

	test('offers all three product types', async ({page}) => {
		const options = page.locator('#productTypeSelect option');
		await expect(options).toHaveCount(3);
		await expect(page.locator('#productTypeSelect option[value="dataset"]')).toHaveCount(1);
		await expect(page.locator('#productTypeSelect option[value="dataService"]')).toHaveCount(1);
		await expect(page.locator('#productTypeSelect option[value="datasetSeries"]')).toHaveCount(1);
	});

	test('dataset (default) shows the Distributions step', async ({page}) => {
		await expect(page.locator('.mat-step-header', {hasText: 'Distributions'})).toBeVisible();
	});

	test('selecting Data service swaps in the Service step and drops Distributions', async ({page}) => {
		await page.locator('#productTypeSelect').selectOption('dataService');
		await expect(page.locator('.mat-step-header', {hasText: 'Service'})).toBeVisible({timeout: 15000});
		await expect(page.locator('.mat-step-header', {hasText: 'Distributions'})).toHaveCount(0);
	});

	test('selecting Dataset series swaps in the Series step and drops Distributions', async ({page}) => {
		await page.locator('#productTypeSelect').selectOption('datasetSeries');
		await expect(page.locator('.mat-step-header', {hasText: 'Series'})).toBeVisible({timeout: 15000});
		await expect(page.locator('.mat-step-header', {hasText: 'Distributions'})).toHaveCount(0);
	});

	test('identifier/title basics are present for every type', async ({page}) => {
		for (const type of ['dataset', 'dataService', 'datasetSeries']) {
			await page.locator('#productTypeSelect').selectOption(type);
			// The Basic step is the first step for all types; its title field is always present.
			await expect(page.locator('input[formcontrolname="dct:title"], app-multilingual-text-field').first()).toBeVisible({timeout: 15000});
		}
	});
});
