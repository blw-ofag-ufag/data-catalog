import {parseLocalDate} from './date-only.util';

describe('parseLocalDate', () => {
	it('parses a YYYY-MM-DD string as a local date (no UTC off-by-one)', () => {
		const d = parseLocalDate('1997-01-01')!;
		expect(d.getFullYear()).toBe(1997);
		expect(d.getMonth()).toBe(0);
		expect(d.getDate()).toBe(1);
		expect(d.getHours()).toBe(0);
	});

	it('returns null for empty/nullish input', () => {
		expect(parseLocalDate('')).toBeNull();
		expect(parseLocalDate(null)).toBeNull();
		expect(parseLocalDate(undefined)).toBeNull();
	});

	it('passes through an existing Date unchanged', () => {
		const input = new Date(2020, 5, 15);
		expect(parseLocalDate(input)).toBe(input);
	});

	it('falls back to the native parser for non date-only strings', () => {
		const d = parseLocalDate('2020-06-15T12:00:00Z')!;
		expect(d).toBeInstanceOf(Date);
		expect(isNaN(d.getTime())).toBe(false);
	});

	it('returns null for an unparseable string', () => {
		expect(parseLocalDate('not-a-date')).toBeNull();
	});
});
