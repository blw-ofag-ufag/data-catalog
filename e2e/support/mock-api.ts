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
export const CHROME_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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
 * This is the default mode using original dataset-only fixtures (backward compatible).
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

/**
 * Install mocks for multi-type product testing (dataset, dataService, datasetSeries).
 *
 * Unlike the earlier version (which served every type through the single datasets.json index and
 * the datasets/ raw folder), this wires each product type to its OWN real URLs so the tests
 * exercise the true per-type routing (#221):
 *  - data/processed/{datasets,dataServices,datasetSeries}.json  — one index per type, each holding
 *    only that type's items (so loadIndex tags them with the correct productType).
 *  - data/raw/{datasets,dataServices,datasetSeries}/<id>.json    — one detail folder per type.
 *  - data/schemas/{dataset,dataService,datasetSeries}.json       — one schema per type, so the
 *    detail metadata table and the edit/create form render each type's real fields offline.
 * Only the BLW publisher repo serves data; every other publisher returns empty so the catalogue is
 * deterministic.
 */
export async function installMultiTypeApiMocks(target: BrowserContext | Page): Promise<void> {
	const mixed: any[] = JSON.parse(readFixture('mixed-products.json'));
	const keywords = readFixture('keywords.json');
	const details: Record<string, string> = {
		datasets: readFixture('dataset-detail.json'),
		dataServices: readFixture('dataservice-detail.json'),
		datasetSeries: readFixture('datasetseries-detail.json')
	};
	const schemas: Record<string, string> = {
		dataset: readFixture('dataset-schema.json'),
		dataService: readFixture('dataservice-schema.json'),
		datasetSeries: readFixture('datasetseries-schema.json')
	};

	const isBlw = (route: Route) => route.request().url().includes('blw-ofag-ufag/metadata');
	const indexFor = (type: string) => JSON.stringify(mixed.filter(p => p.productType === type));

	// Per-type processed indexes (segment -> productType). Only BLW serves items.
	const indexRoutes: [string, string][] = [
		['datasets', 'dataset'],
		['dataServices', 'dataService'],
		['datasetSeries', 'datasetSeries']
	];
	for (const [segment, type] of indexRoutes) {
		await target.route(`**/data/processed/${segment}.json`, route => fulfillJson(route, isBlw(route) ? indexFor(type) : '[]'));
	}

	// Keyword list (same payload for every publisher repo).
	await target.route('**/data/schemas/keywords.json', route => fulfillJson(route, keywords));

	// Per-type schemas.
	for (const [type, body] of Object.entries(schemas)) {
		await target.route(`**/data/schemas/${type}.json`, route => fulfillJson(route, body));
	}

	// Per-type raw detail folders.
	for (const [segment, body] of Object.entries(details)) {
		await target.route(`**/data/raw/${segment}/*.json`, route => fulfillJson(route, body));
	}

	// i14y themes: return [] so the app falls back to its built-in themes, while
	// avoiding the slow external call.
	await target.route('**/www.i14y.admin.ch/**', route => fulfillJson(route, '[]'));
}
