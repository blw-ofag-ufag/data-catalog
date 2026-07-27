import {defineConfig, devices} from '@playwright/test';
import base from './playwright.config';

/**
 * Local-sandbox E2E config: identical to playwright.config.ts but launches the system-installed
 * Chromium at /usr/bin/chromium-browser. Use this when the bundled Playwright Chromium can't run
 * (e.g. WSL/containers missing libnspr4, where `npx playwright install --with-deps` needs root).
 *
 * Run with: npm run test:e2e:local
 * Everything else (fixtures, offline network mocks, the auto-started dev server) is inherited from
 * the base config.
 */
export default defineConfig(base, {
	use: {
		launchOptions: {
			executablePath: process.env['CHROMIUM_PATH'] || '/usr/bin/chromium-browser',
			args: ['--no-sandbox']
		}
	},
	projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}]
});
