import {OrgPipe} from './org.pipe';
import {stubTranslateService} from '../../tests/helpers/service-stubs';

describe('OrgPipe', () => {
	it('should create an instance', () => {
		const pipe = new OrgPipe(stubTranslateService());
		expect(pipe).toBeTruthy();
	});

	it('translates the value using the publisher choices key', () => {
		const translate = stubTranslateService({instant: jest.fn((key: string) => `translated:${key}`)});
		const pipe = new OrgPipe(translate);

		expect(pipe.transform('BLW')).toBe('translated:choices.dataset.dct:publisher.BLW');
		expect(translate.instant).toHaveBeenCalledWith('choices.dataset.dct:publisher.BLW');
	});

	it('returns the echoed key when no translation is available', () => {
		const pipe = new OrgPipe(stubTranslateService());
		expect(pipe.transform('UNKNOWN')).toBe('choices.dataset.dct:publisher.UNKNOWN');
	});

	it('handles an empty value', () => {
		const pipe = new OrgPipe(stubTranslateService());
		expect(pipe.transform('')).toBe('choices.dataset.dct:publisher.');
	});
});
