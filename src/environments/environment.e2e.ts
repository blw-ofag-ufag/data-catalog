/**
 * Environment used only by the Playwright e2e suite (`ng serve --configuration e2e`, wired up via
 * angular.json fileReplacements and playwright.config.ts's webServer).
 *
 * debugMode bypasses the GitHubAuthGuard so the /modify create+edit specs can reach the form
 * without a real GitHub token. The guard has no other bypass — GitHubAuthService only becomes
 * authenticated after an in-session validateCredentials() call and never restores from storage —
 * so seeding localStorage/sessionStorage is not sufficient.
 *
 * This exists so the suite is hermetic: nobody has to hand-edit the committed environment.ts to
 * make the e2e run green (doing so previously failed 13 /modify specs).
 */
export const environment = {
	production: false,
	debugMode: true,
	mockRepository: 'blw-ofag-ufag/metadata'
};
