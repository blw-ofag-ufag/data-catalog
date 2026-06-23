import {BrowserContext, Page, Route} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const fixturesDir = path.join(__dirname, '..', 'fixtures');

/**
 * A regular Desktop Chrome user-agent. The bundled Playwright chromium reports a
 * "HeadlessChrome" user-agent, which Oblique's master layout treats as an
 * unsupported browser and replaces the whole app with a warning screen. Applying
 * this UA via `test.use({userAgent: CHROME_USER_AGENT})` in every spec keeps the
 * real app rendered.
 */
export const CHROME_USER_AGENT =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function readFixture(name: string): string {
	return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
}

function fulfillJson(route: Route, body: string) {
	return route.fulfill({
		status: 200,
		contentType: 'application/json',
		headers: {'access-control-allow-origin': '*'},
		body
	});
}

/**
 * Wire all external/GitHub/i14y network requests to deterministic offline fixtures.
 *
 * The app fetches:
 *  - data/processed/datasets.json  (index, once per publisher) via native fetch()
 *  - data/schemas/keywords.json    (keyword list)               via native fetch()
 *  - data/raw/datasets/<id>.json   (single dataset detail)      via native fetch()
 *  - www.i14y.admin.ch/**          (themes)                     via HttpClient
 *
 * Routing at the network layer covers both fetch() and HttpClient. Unmatched
 * localhost / asset requests fall through untouched.
 *
 * `installApiMocks` accepts either a BrowserContext or a Page.
 */
export async function installApiMocks(target: BrowserContext | Page): Promise<void> {
	const datasets = readFixture('datasets.json');
	const keywords = readFixture('keywords.json');
	const detail = readFixture('dataset-detail.json');

	// Index: served only for the BLW publisher repo; other publishers return [] to
	// keep the dataset list deterministic (exactly the two fixture datasets).
	await target.route('**/data/processed/datasets.json', route => {
		const url = route.request().url();
		if (url.includes('blw-ofag-ufag/metadata')) {
			return fulfillJson(route, datasets);
		}
		return fulfillJson(route, '[]');
	});

	// Keyword list (same payload for every publisher repo).
	await target.route('**/data/schemas/keywords.json', route => fulfillJson(route, keywords));

	// Single dataset detail.
	await target.route('**/data/raw/datasets/*.json', route => fulfillJson(route, detail));

	// i14y themes: return [] so the app falls back to its built-in themes, while
	// avoiding the slow external call.
	await target.route('**/www.i14y.admin.ch/**', route => fulfillJson(route, '[]'));
}
