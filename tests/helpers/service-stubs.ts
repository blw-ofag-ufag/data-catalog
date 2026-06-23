import {of} from 'rxjs';

/**
 * Lightweight stubs for services injected by form-field & page components.
 * Returned objects are intentionally `any`-shaped so specs can override per case.
 */

export function stubValidationSchemaService(overrides: Record<string, unknown> = {}): any {
	return {
		getFieldDebugInfo: jest.fn().mockReturnValue({fieldKey: '', schemaMessages: [], componentMessages: []}),
		getFieldValidation: jest.fn().mockReturnValue(undefined),
		getCombinedValidators: jest.fn().mockReturnValue([]),
		isFieldRequired: jest.fn().mockReturnValue(false),
		getSchema: jest.fn().mockReturnValue(undefined),
		getAllSchemas: jest.fn().mockReturnValue([]),
		isLoaded: jest.fn().mockReturnValue(of(true)),
		getLoadError: jest.fn().mockReturnValue(of(null)),
		retryLoadingSchemas: jest.fn(),
		...overrides
	};
}

export function stubTranslateService(overrides: Record<string, unknown> = {}): any {
	return {
		currentLang: 'de',
		defaultLang: 'de',
		instant: jest.fn((key: string) => key),
		get: jest.fn((key: string) => of(key)),
		stream: jest.fn((key: string) => of(key)),
		use: jest.fn((lang: string) => of(lang)),
		onLangChange: of({lang: 'de', translations: {}}),
		onTranslationChange: of({}),
		onDefaultLangChange: of({}),
		...overrides
	};
}

export function stubKeywordService(keywords: any[] = [], overrides: Record<string, unknown> = {}): any {
	return {
		loadKeywords: jest.fn().mockReturnValue(of(keywords)),
		getKeywords: jest.fn().mockReturnValue(keywords),
		getKeywordLabels: jest.fn().mockReturnValue(null),
		getKeywordCodes: jest.fn().mockReturnValue(keywords.map(k => k.code ?? '')),
		...overrides
	};
}

export function stubThemeService(themes: any[] = [], overrides: Record<string, unknown> = {}): any {
	return {
		loadThemes: jest.fn().mockReturnValue(of(themes)),
		getThemes: jest.fn().mockReturnValue(themes),
		getThemeLabels: jest.fn().mockReturnValue(null),
		getThemeCodes: jest.fn().mockReturnValue(themes.map(t => t.code ?? '')),
		...overrides
	};
}
