import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installMultiTypeApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

// These tests exercise the REAL per-type routing: each product type is served from its own
// processed index, raw-detail folder and schema (see installMultiTypeApiMocks). Detail pages are
// opened with the `type` query param so the app resolves the per-type detail URL (#221).

test.describe('Multi-Type Product Listing', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/index?pageSize=100');
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible({timeout: 30000});
	});

	test('lists products of all three types together', async ({page}) => {
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible(); // dataset
		await expect(page.getByText('Apple API Service EN')).toBeVisible(); // dataService
		await expect(page.getByText('Apple Harvest Time Series EN')).toBeVisible(); // datasetSeries
	});

	test('each tile shows its own product-type chip (not always "Dataset")', async ({page}) => {
		await expect(page.getByText('Data service', {exact: true})).toBeVisible();
		await expect(page.getByText('Dataset series', {exact: true})).toBeVisible();
		await expect(page.getByText('Dataset', {exact: true})).toBeVisible();
	});

	test('the productType URL filter narrows the list to a single type', async ({page}) => {
		await page.goto('/data-catalog/#/index?pageSize=100&productType=dataService');
		await expect(page.getByText('Apple API Service EN')).toBeVisible({timeout: 30000});
		await expect(page.getByText('Apple Harvest Statistics EN')).toHaveCount(0);
		await expect(page.getByText('Apple Harvest Time Series EN')).toHaveCount(0);
	});

	test('free-text search matches across all types', async ({page}) => {
		const search = page.getByRole('textbox').first();
		await search.fill('apples');
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
		await expect(page.getByText('Apple API Service EN')).toBeVisible();
		await expect(page.getByText('Apple Harvest Time Series EN')).toBeVisible();
	});

	// Regression (#221): deselecting the Type facet must clear `productType` from the URL, otherwise the
	// stale param is re-applied on the next navigation (pagination/sort). Before the fix, setFilters
	// never nulled the synthetic productType facet, so the filter could not be turned off.
	test('deselecting the Type facet clears the filter from the URL', async ({page}) => {
		await page.goto('/data-catalog/#/index?pageSize=100&productType=dataService&showFilters=true');
		// Filter active: only the dataService is listed.
		await expect(page.getByText('Apple API Service EN')).toBeVisible({timeout: 30000});
		await expect(page.getByText('Apple Harvest Statistics EN')).toHaveCount(0);

		// Open the Type facet select and toggle the selected option off.
		await page.locator('index-filter-col mat-select').first().click();
		await page.getByRole('option', {name: 'Data service', exact: true}).click();
		await page.keyboard.press('Escape');

		// All types return and the productType param is gone from the URL.
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
		await expect(page.getByText('Apple Harvest Time Series EN')).toBeVisible();
		await expect.poll(() => page.url()).not.toContain('productType');
	});
});

test.describe('Dataset Detail View', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-001&type=dataset');
		await expect(page.getByRole('heading', {name: /Apple Harvest Statistics EN/i})).toBeVisible({timeout: 30000});
	});

	test('shows the dataset title, description and distributions', async ({page}) => {
		await expect(page.getByText(/Description of the apple harvest dataset\./i)).toBeVisible();
		await expect(page.getByText(/distributions/i)).toBeVisible();
	});

	test('does not show a Data Sets (container) section', async ({page}) => {
		await expect(page.getByRole('heading', {name: /^Data Sets$/i})).toHaveCount(0);
	});
});

test.describe('DataService Detail View', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-service-001&type=dataService');
		await expect(page.getByRole('heading', {name: /Apple API Service EN/i})).toBeVisible({timeout: 30000});
	});

	test('renders the service-specific endpoint field (from the dataService schema)', async ({page}) => {
		await expect(page.getByText('https://example.org/apple-api')).toBeVisible();
	});

	test('renders the served datasets as a Data Sets tile section', async ({page}) => {
		await expect(page.getByRole('heading', {name: /^Data Sets$/i})).toBeVisible();
		// The referenced dataset (ds-001) resolves from the store and renders as a card tile.
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
	});
});

test.describe('DatasetSeries Detail View', () => {
	test.beforeEach(async ({context, page}) => {
		await installMultiTypeApiMocks(context);
		await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-series-001&type=datasetSeries');
		await expect(page.getByRole('heading', {name: /Apple Harvest Time Series EN/i})).toBeVisible({timeout: 30000});
	});

	test('shows the series title and description', async ({page}) => {
		await expect(page.getByText(/Time series of annual apple harvest data\./i)).toBeVisible();
	});

	test('renders the member datasets as a Data Sets tile section', async ({page}) => {
		await expect(page.getByRole('heading', {name: /^Data Sets$/i})).toBeVisible();
		await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
	});
});
