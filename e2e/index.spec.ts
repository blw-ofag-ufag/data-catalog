import {expect, test} from '@playwright/test';
import {CHROME_USER_AGENT, installApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

test.beforeEach(async ({context, page}) => {
	await installApiMocks(context);
	await page.goto('/data-catalog/#/index');
	// Wait for the data products section + both fixture cards to render.
	await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
});

test('shows both fixture dataset titles', async ({page}) => {
	await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
	await expect(page.getByText('Soil Moisture Measurements EN')).toBeVisible();
});

test('search filters the list', async ({page}) => {
	const search = page.getByRole('textbox').first();
	await search.fill('Apple');

	await expect(page.getByText('Apple Harvest Statistics EN')).toBeVisible();
	await expect(page.getByText('Soil Moisture Measurements EN')).toHaveCount(0);
});

test('a search with no matches shows the no-results message', async ({page}) => {
	const search = page.getByRole('textbox').first();
	await search.fill('zzzz-no-such-dataset-zzzz');

	await expect(page.getByText(/No results found/i)).toBeVisible();
	await expect(page.getByText('Apple Harvest Statistics EN')).toHaveCount(0);
});

test('clicking a keyword chip navigates to /index with a keyword query param', async ({page}) => {
	// Keyword chips are anchors with routerLink to /index and a dcat:keyword query param.
	const chip = page.getByRole('link', {name: 'apples', exact: true}).first();
	await chip.click();

	await expect.poll(() => page.url()).toContain('dcat:keyword');
	await expect.poll(() => page.url()).toContain('apples');
});

test('switching between card and list view changes the layout', async ({page}) => {
	// Card (tile) view renders mat-card; list view renders a table.
	await expect(page.locator('mat-card').first()).toBeVisible();

	// The view-switch buttons are icon-only (mat-icon-button) with a tooltip;
	// target them by the svg icon they contain.
	const listButton = page.locator('button:has(mat-icon[svgicon="list"])');
	const cardsButton = page.locator('button:has(mat-icon[svgicon="apps"])');

	// Switch to the list/table view.
	await listButton.click();
	await expect(page.locator('table.ob-table')).toBeVisible();
	await expect(page.locator('mat-card')).toHaveCount(0);

	// Switch back to cards.
	await cardsButton.click();
	await expect(page.locator('mat-card').first()).toBeVisible();
});
