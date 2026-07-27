import {StatusPipe} from './status.pipe';
import {stubTranslateService} from '../../tests/helpers/service-stubs';

describe('StatusPipe', () => {
	it('should create an instance', () => {
		const pipe = new StatusPipe(stubTranslateService());
		expect(pipe).toBeTruthy();
	});

	it('translates the value using the status schema key', () => {
		const translate = stubTranslateService({instant: jest.fn((key: string) => `translated:${key}`)});
		const pipe = new StatusPipe(translate);

		expect(pipe.transform('published')).toBe('translated:schema.dataset.status.published');
		expect(translate.instant).toHaveBeenCalledWith('schema.dataset.status.published');
	});

	it('returns the echoed key when no translation is available', () => {
		const pipe = new StatusPipe(stubTranslateService());
		expect(pipe.transform('draft')).toBe('schema.dataset.status.draft');
	});

	it('handles an empty value', () => {
		const pipe = new StatusPipe(stubTranslateService());
		expect(pipe.transform('')).toBe('schema.dataset.status.');
	});
});
