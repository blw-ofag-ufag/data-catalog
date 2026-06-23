import {expect, Page, test} from '@playwright/test';
import {CHROME_USER_AGENT, installApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

/**
 * Collect uncaught exceptions thrown in the page. We only assert on real
 * `pageerror` exceptions, not console warnings (which are too noisy).
 */
function trackPageErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', err => errors.push(err.message));
	return errors;
}

test.beforeEach(async ({context}) => {
	await installApiMocks(context);
});

const routes: {name: string; hash: string; expected: RegExp}[] = [
	{name: 'index', hash: '#/index', expected: /Agri-Food Data Catalog/i},
	{name: 'home', hash: '#/home', expected: /Oblique/i},
	{name: 'about', hash: '#/about', expected: /.+/},
	{name: 'handbook', hash: '#/handbook', expected: /.+/},
	{name: 'modify form', hash: '#/modify/form', expected: /.+/},
	{name: 'unknown route', hash: '#/this-route-does-not-exist', expected: /this route does not seem to exist|something went wrong/i}
];

for (const route of routes) {
	test(`renders ${route.name} without page errors`, async ({page}) => {
		const errors = trackPageErrors(page);
		await page.goto(`/data-catalog/${route.hash}`);

		// The app shell (Oblique master layout header title) should always render.
		await expect(page.locator('body')).toContainText(/Agri-Food/i);
		await expect(page.locator('body')).toContainText(route.expected);

		expect(errors, `page errors on ${route.name}: ${errors.join(' | ')}`).toEqual([]);
	});
}

test('details route renders without page errors', async ({page}) => {
	const errors = trackPageErrors(page);
	await page.goto('/data-catalog/#/details?publisher=BLW-OFAG-UFAG-FOAG&dataset=ds-001');
	await expect(page.getByRole('heading', {name: /Apple Harvest Statistics EN/i})).toBeVisible();
	expect(errors, `page errors on details: ${errors.join(' | ')}`).toEqual([]);
});
