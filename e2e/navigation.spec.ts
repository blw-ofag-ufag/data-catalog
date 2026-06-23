import {expect, Page, test} from '@playwright/test';
import {CHROME_USER_AGENT, installApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

/**
 * Switch the UI language via the Oblique service-navigation language selector,
 * which is rendered as a mat-select combobox with options "DE", "FR", "IT", "EN".
 */
async function switchLanguage(page: Page, lang: 'de' | 'fr' | 'it' | 'en'): Promise<void> {
	const code = lang.toUpperCase();
	await page.locator('.ob-language-dropdown mat-select').first().click();
	await page.locator('mat-option').filter({hasText: new RegExp(`^${code}$`)}).click();
}

test.beforeEach(async ({context}) => {
	await installApiMocks(context);
});

test('language switch updates visible UI text (EN to DE)', async ({page}) => {
	await page.goto('/data-catalog/#/index?lang=en');
	await expect(page.getByText('Data Products', {exact: true})).toBeVisible();

	await switchLanguage(page, 'de');

	// German UI label for the data products section.
	await expect(page.getByText('Datenprodukte', {exact: true})).toBeVisible();
	await expect(page.getByText('Data Products', {exact: true})).toHaveCount(0);
});

test('language switch updates visible UI text (EN to FR)', async ({page}) => {
	await page.goto('/data-catalog/#/index?lang=en');
	await expect(page.getByText('Data Products', {exact: true})).toBeVisible();

	await switchLanguage(page, 'fr');

	// French app title contains the French office description.
	await expect(page.getByText(/Office f[eé]d[eé]ral de l.agriculture/i).first()).toBeVisible();
});

test('about page renders its content', async ({page}) => {
	await page.goto('/data-catalog/#/about');
	const content = page.locator('.about-container .markdown-content');
	await expect(content).toBeVisible();
	await expect(content).not.toBeEmpty();
});

test('handbook page renders its content', async ({page}) => {
	await page.goto('/data-catalog/#/handbook');
	const content = page.locator('.handbook-container .markdown-content');
	await expect(content).toBeVisible();
	await expect(content).not.toBeEmpty();
});
