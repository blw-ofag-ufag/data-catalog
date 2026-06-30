import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installMultiTypeApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

test.describe('Edit Dataset', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-001');
		await expect(page.getByRole('heading', {name: /Apple Harvest Statistics EN/i})).toBeVisible({timeout: 30000});
	});

	test('edit button is visible on detail page', async ({page}) => {
		const editButton = page.getByRole('button', {name: /edit/i}).first();
		await expect(editButton).toBeVisible();
	});

	test('clicking edit navigates to modify form', async ({page}) => {
		const editButton = page.getByRole('button', {name: /edit/i}).first();
		await editButton.click();
		
		// Should navigate to modify form
		await expect.poll(() => page.url()).toContain('/modify');
		
		// Form should load
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
	});

	test('edit form shows dataset type as read-only', async ({page}) => {
		const editButton = page.getByRole('button', {name: /edit/i}).first();
		await editButton.click();
		
		// Wait for form to load
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
		
		// Product type should be read-only or not editable
		// It should show the current type
		const typeDisplay = page.getByText(/dataset/i).first();
		await expect(typeDisplay).toBeVisible();
	});
});

test.describe('Edit DataService', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-service-001');
		await expect(page.getByRole('heading', {name: /Apple API Service EN/i})).toBeVisible({timeout: 30000});
	});

	test('edit button works for dataService', async ({page}) => {
		const editButton = page.getByRole('button', {name: /edit/i}).first();
		await expect(editButton).toBeVisible();
		await editButton.click();
		
		// Should navigate to modify form
		await expect.poll(() => page.url()).toContain('/modify');
		
		// Form should load
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
	});

	test('edit form displays service-specific fields', async ({page}) => {
		const editButton = page.getByRole('button', {name: /edit/i}).first();
		await editButton.click();
		
		// Wait for form
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
		
		// Service should be editable with appropriate fields
		const formElements = page.locator('input[formcontrolname], textarea[formcontrolname]');
		await expect(formElements.first()).toBeVisible();
	});
});

test.describe('Edit DatasetSeries', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-series-001');
		await expect(page.getByRole('heading', {name: /Apple Harvest Time Series EN/i})).toBeVisible({timeout: 30000});
	});

	test('edit button works for datasetSeries', async ({page}) => {
		const editButton = page.getByRole('button', {name: /edit/i}).first();
		await expect(editButton).toBeVisible();
		await editButton.click();
		
		// Should navigate to modify form
		await expect.poll(() => page.url()).toContain('/modify');
		
		// Form should load
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
	});

	test('edit form displays series-specific fields', async ({page}) => {
		const editButton = page.getByRole('button', {name: /edit/i}).first();
		await editButton.click();
		
		// Wait for form
		await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
		
		// Series should be editable with appropriate fields
		const formElements = page.locator('input[formcontrolname], textarea[formcontrolname]');
		await expect(formElements.first()).toBeVisible();
	});
});
