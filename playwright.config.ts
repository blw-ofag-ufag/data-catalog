import {defineConfig, devices} from '@playwright/test';

/**
 * E2E config. The app serves under base-href /data-catalog with hash routing,
 * so page URLs look like http://localhost:4200/data-catalog/#/index.
 * Network to GitHub (raw + api) is intercepted per-spec with fixtures, and
 * environment.debugMode bypasses the GitHub auth guard for /modify.
 *
 * Set CHROMIUM_PATH to run against a system-installed Chromium instead of the one
 * Playwright bundles. Needed in sandboxes where `npx playwright install --with-deps`
 * cannot run (WSL/containers missing libnspr4, which needs root to install):
 *
 *   CHROMIUM_PATH=/usr/bin/chromium-browser npm run test:e2e
 *
 * --no-sandbox is applied together with the override because the system browser is
 * typically launched in a container without user namespaces.
 */
const systemChromium = process.env['CHROMIUM_PATH'];

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env['CI'],
	retries: process.env['CI'] ? 2 : 0,
	workers: process.env['CI'] ? 1 : undefined,
	reporter: process.env['CI'] ? [['html', {open: 'never'}], ['list']] : 'list',
	use: {
		baseURL: 'http://localhost:4300/data-catalog/',
		trace: 'on-first-retry',
		...(systemChromium ? {launchOptions: {executablePath: systemChromium, args: ['--no-sandbox']}} : {})
	},
	projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
	webServer: {
		// `ng serve` answers history-fallback only for Accept: text/html, so the
		// readiness probe (Accept: */*) must hit the static index at root, not /data-catalog/.
		//
		// Served under the `e2e` configuration, which swaps in environment.e2e.ts (debugMode: true)
		// so the GitHubAuthGuard lets the /modify specs through. Keeps the suite hermetic — no
		// hand-editing of the committed environment.ts (see src/environments/environment.e2e.ts).
		//
		// Deliberately on its own port: with reuseExistingServer, a developer's plain `npm start` on
		// :4200 (debugMode: false) would be adopted instead, and the /modify specs would fail the
		// auth guard for reasons that look like product bugs.
		command: 'npm run start:e2e',
		url: 'http://localhost:4300',
		reuseExistingServer: !process.env['CI'],
		timeout: 180_000
	}
});
