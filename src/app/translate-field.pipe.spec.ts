import {TranslateFieldPipe} from './translate-field.pipe';
import {stubTranslateService} from '../../tests/helpers/service-stubs';

describe('TranslateFieldPipe', () => {
	it('should create an instance', () => {
		const pipe = new TranslateFieldPipe(stubTranslateService());
		expect(pipe).toBeTruthy();
	});

	describe('string data', () => {
		it('returns the translation when the choices key resolves', () => {
			const translate = stubTranslateService({instant: jest.fn((key: string) => `translated:${key}`)});
			const pipe = new TranslateFieldPipe(translate);

			expect(pipe.transform(['dct:accrualPeriodicity', 'ANNUAL'])).toBe('translated:choices.dataset.dct:accrualPeriodicity.ANNUAL');
			expect(translate.instant).toHaveBeenCalledWith('choices.dataset.dct:accrualPeriodicity.ANNUAL');
		});

		it('falls back to the raw value when the key is not translated (echoed)', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService());
			expect(pipe.transform(['label', 'RAW_VALUE'])).toBe('RAW_VALUE');
		});

		it('returns an empty string when the value is an empty string and untranslated', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService());
			expect(pipe.transform(['label', ''])).toBe('');
		});
	});

	describe('multilingual object data', () => {
		it('returns the current language value', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService({currentLang: 'fr'}));
			expect(pipe.transform(['dct:title', {de: 'Titel', fr: 'Titre', it: 'Titolo', en: 'Title'}])).toBe('Titre');
		});

		it('falls back to en when the current language is missing', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService({currentLang: 'it'}));
			expect(pipe.transform(['dct:title', {de: 'Titel', en: 'Title'}])).toBe('Title');
		});

		it('falls back through de then fr then it when en is missing', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService({currentLang: 'en'}));
			expect(pipe.transform(['dct:title', {fr: 'Titre', it: 'Titolo'}])).toBe('Titre');
		});

		it('returns an empty string when no language has content', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService({currentLang: 'de'}));
			expect(pipe.transform(['dct:title', {}])).toBe('');
		});
	});

	describe('nullish data', () => {
		it('returns an empty string for undefined data', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService());
			expect(pipe.transform(['dct:title', undefined])).toBe('');
		});

		it('returns an empty string for null data', () => {
			const pipe = new TranslateFieldPipe(stubTranslateService());
			expect(pipe.transform(['dct:title', null as any])).toBe('');
		});
	});
});
