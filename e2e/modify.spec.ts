import {expect, Page, test} from '@playwright/test';
import {CHROME_USER_AGENT, installApiMocks} from './support/mock-api';

test.use({userAgent: CHROME_USER_AGENT});

/**
 * These tests assert CURRENT (develop) behavior of the modify form:
 *  - the multi-step stepper renders
 *  - the Distributions step can be reached and a distribution added
 *  - the distribution identifier input IS present
 *  - in German, the issued-date label is "Ausgabedatum" (NOT "Veröffentlichungsdatum")
 *
 * The form is an Angular Material vertical stepper; steps are reached by clicking
 * their step headers. Stepper navigation can be finicky, so the assertions below
 * are kept tolerant.
 */

/** Switch the UI language via the Oblique mat-select language switcher (DE/FR/IT/EN). */
async function switchLanguage(page: Page, code: 'DE' | 'FR' | 'IT' | 'EN'): Promise<void> {
	await page.locator('.ob-language-dropdown mat-select').first().click();
	await page.locator('mat-option').filter({hasText: new RegExp(`^${code}$`)}).click();
}

test.beforeEach(async ({context, page}) => {
	await installApiMocks(context);
	await page.goto('/data-catalog/#/modify/form?lang=en');
	// The Material stepper renders its step headers.
	await expect(page.locator('.mat-step-header').first()).toBeVisible({timeout: 30000});
});

test('the multi-step stepper renders', async ({page}) => {
	const steps = page.locator('.mat-step-header');
	await expect(steps.first()).toBeVisible();
	expect(await steps.count()).toBeGreaterThan(1);
});

test('can reach the Distributions step and add a distribution', async ({page}) => {
	// Click the Distributions step header to navigate to it.
	const distributionsStep = page.locator('.mat-step-header').filter({hasText: /Distributions/i}).first();
	await distributionsStep.click();

	// Add a distribution.
	const addButton = page.getByRole('button', {name: /Add distribution/i});
	await expect(addButton).toBeVisible();
	await addButton.click();

	// The distribution identifier input IS present (current develop behavior).
	const identifierInput = page.locator('input[formControlName="dct:identifier"]');
	await expect(identifierInput.first()).toBeVisible();
});

test('German issued-date label is "Ausgabedatum" (not "Veröffentlichungsdatum")', async ({page}) => {
	// Switch the UI to German using the header language switcher.
	await switchLanguage(page, 'DE');
	// Step labels become German once the language is applied.
	await expect(page.locator('.mat-step-header').filter({hasText: /Metadaten/i}).first()).toBeVisible();

	// Open the Metadata & Versioning step, which contains the issued-date field.
	await page.locator('.mat-step-header').filter({hasText: /Metadaten/i}).first().click();

	// The issued-date label uses translation key labels.dct:issued, which in the
	// current develop German translations is "Ausgabedatum".
	await expect(page.getByText('Ausgabedatum', {exact: false}).first()).toBeVisible();
	await expect(page.getByText('Veröffentlichungsdatum')).toHaveCount(0);
});
