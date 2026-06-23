'use strict';

module.exports = {
	preset: 'jest-preset-angular',
	setupFilesAfterEnv: ['<rootDir>/tests/setupJest.ts'],
	collectCoverage: true,
	// Keep Jest away from Playwright e2e specs (also *.spec.ts).
	roots: ['<rootDir>/src', '<rootDir>/tests'],
	testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
	coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/', '<rootDir>/tests/']
};
