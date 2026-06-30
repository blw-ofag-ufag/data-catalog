import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installMultiTypeApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

test.describe('Multi-Type Product Listing', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/index');
		// Wait for at least one product to render
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible({timeout: 30000});
	});

	test('shows all three product types in list', async ({page}) => {
		// Dataset
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
		// DataService
		await expect(page.getByText('Apple API Service EN')).toBeVisible();
		// DatasetSeries
		await expect(page.getByText('Apple Harvest Time Series EN')).toBeVisible();
	});

	test('search filters products by title across all types', async ({page}) => {
		const search = page.getByRole('textbox').first();
		await search.fill('API');

		// Only the dataService should be visible
		await expect(page.getByText('Apple API Service EN')).toBeVisible();
		await expect(page.getByText('Apple Harvest Statistics EN')).toHaveCount(0);
		await expect(page.getByText('Apple Harvest Time Series EN')).toHaveCount(0);
	});

	test('search by keyword works across product types', async ({page}) => {
		const search = page.getByRole('textbox').first();
		await search.fill('apples');

		// All three have "apples" keyword
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
		await expect(page.getByText('Apple API Service EN')).toBeVisible();
		await expect(page.getByText('Apple Harvest Time Series EN')).toBeVisible();
	});
});

test.describe('Dataset Detail View', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-001');
		await expect(page.getByRole('heading', {name: /Apple Harvest Statistics EN/i})).toBeVisible({timeout: 30000});
	});

	test('displays dataset title and description', async ({page}) => {
		await expect(page.getByRole('heading', {name: /Apple Harvest Statistics EN/i})).toBeVisible();
		await expect(page.getByText(/Description of the apple harvest dataset\./i)).toBeVisible();
	});

	test('shows dataset-specific sections', async ({page}) => {
		// Datasets should have distributions section
		await expect(page.getByText(/distributions/i)).toBeVisible();
	});

	test('renders keyword chips for dataset', async ({page}) => {
		await expect(page.getByRole('link', {name: 'apples', exact: true}).first()).toBeVisible();
		await expect(page.getByRole('link', {name: 'harvest', exact: true}).first()).toBeVisible();
	});
});

test.describe('DataService Detail View', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-service-001');
		await expect(page.getByRole('heading', {name: /Apple API Service EN/i})).toBeVisible({timeout: 30000});
	});

	test('displays dataService title and description', async ({page}) => {
		await expect(page.getByRole('heading', {name: /Apple API Service EN/i})).toBeVisible();
		await expect(page.getByText(/A service for apple data access\./i)).toBeVisible();
	});

	test('shows service-specific endpoint information', async ({page}) => {
		// Should show endpoint URL
		const endpointText = page.getByText('https://example.org/apple-api');
		await expect(endpointText).toBeVisible();
	});

	test('renders keyword chips for dataService', async ({page}) => {
		await expect(page.getByRole('link', {name: 'apples', exact: true}).first()).toBeVisible();
		await expect(page.getByRole('link', {name: 'api', exact: true}).first()).toBeVisible();
		await expect(page.getByRole('link', {name: 'service', exact: true}).first()).toBeVisible();
	});
});

test.describe('DatasetSeries Detail View', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-series-001');
		await expect(page.getByRole('heading', {name: /Apple Harvest Time Series EN/i})).toBeVisible({timeout: 30000});
	});

	test('displays datasetSeries title and description', async ({page}) => {
		await expect(page.getByRole('heading', {name: /Apple Harvest Time Series EN/i})).toBeVisible();
		await expect(page.getByText(/Time series of annual apple harvest data\./i)).toBeVisible();
	});

	test('shows series-specific information', async ({page}) => {
		// Series might have periodicity or member information
		// These would show up in the metadata section
		await expect(page.getByText(/heading\.metadata/i)).toBeVisible();
	});

	test('renders keyword chips for datasetSeries', async ({page}) => {
		await expect(page.getByRole('link', {name: 'apples', exact: true}).first()).toBeVisible();
		await expect(page.getByRole('link', {name: 'harvest', exact: true}).first()).toBeVisible();
		await expect(page.getByRole('link', {name: 'time-series', exact: true}).first()).toBeVisible();
	});
});
