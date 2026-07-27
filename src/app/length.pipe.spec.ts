import {LengthPipe} from './length.pipe';

describe('LengthPipe', () => {
	let pipe: LengthPipe;

	beforeEach(() => {
		pipe = new LengthPipe();
	});

	it('should create an instance', () => {
		expect(pipe).toBeTruthy();
	});

	it('returns the length of a non-empty array', () => {
		expect(pipe.transform([1, 2, 3])).toBe(3);
	});

	it('returns 0 for an empty array', () => {
		expect(pipe.transform([])).toBe(0);
	});

	it('returns the length of a string', () => {
		expect(pipe.transform('hello')).toBe(5);
	});

	it('returns 0 for an empty string', () => {
		expect(pipe.transform('')).toBe(0);
	});
});
