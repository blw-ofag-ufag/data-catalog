import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

test.beforeEach(async ({context, page}) => {
	await installApiMocks(context);
	await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-001');
	await expect(page.getByRole('heading', {name: /Apple Harvest Statistics EN/i})).toBeVisible();
});

test('renders the title and description', async ({page}) => {
	await expect(page.getByRole('heading', {name: /Apple Harvest Statistics EN/i})).toBeVisible();
	await expect(page.getByText(/Description of the apple harvest dataset\./i)).toBeVisible();
});

test('renders keyword chips', async ({page}) => {
	// Keyword chips are rendered as anchors linking back to /index.
	await expect(page.getByRole('link', {name: 'apples', exact: true}).first()).toBeVisible();
	await expect(page.getByRole('link', {name: 'harvest', exact: true}).first()).toBeVisible();
});

test('distribution shows distinct access and download links', async ({page}) => {
	// Open the distribution expansion panel (CSV format).
	await page.getByRole('button', {name: /CSV/}).first().click();

	const accessLink = page.locator('a[href="https://example.org/access"]');
	const downloadLink = page.locator('a[href="https://example.org/download.csv"]');

	await expect(accessLink).toBeVisible();
	await expect(downloadLink).toBeVisible();

	// The two URLs must be distinct.
	await expect(accessLink).toHaveAttribute('href', 'https://example.org/access');
	await expect(downloadLink).toHaveAttribute('href', 'https://example.org/download.csv');
});
