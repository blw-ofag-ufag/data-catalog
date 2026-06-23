import {defineConfig, devices} from '@playwright/test';

/**
 * E2E config. The app serves under base-href /data-catalog with hash routing,
 * so page URLs look like http://localhost:4200/data-catalog/#/index.
 * Network to GitHub (raw + api) is intercepted per-spec with fixtures, and
 * environment.debugMode bypasses the GitHub auth guard for /modify.
 */
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env['CI'],
	retries: process.env['CI'] ? 2 : 0,
	workers: process.env['CI'] ? 1 : undefined,
	reporter: process.env['CI'] ? [['html', {open: 'never'}], ['list']] : 'list',
	use: {
		baseURL: 'http://localhost:4200/data-catalog/',
		trace: 'on-first-retry'
	},
	projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
	webServer: {
		// `ng serve` answers history-fallback only for Accept: text/html, so the
		// readiness probe (Accept: */*) must hit the static index at root, not /data-catalog/.
		command: 'npm start',
		url: 'http://localhost:4200',
		reuseExistingServer: !process.env['CI'],
		timeout: 180_000
	}
});
