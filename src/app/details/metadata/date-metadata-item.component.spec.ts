// Pin the timezone BEFORE anything reads it: this regression must fail on a Swiss
// (UTC+1/+2) clock, which is the actual audience. On a UTC CI runner the off-by-one
// is invisible, so we force Europe/Zurich here (see issue #259).
process.env.TZ = 'Europe/Zurich';

import {DatePipe, registerLocaleData} from '@angular/common';
import localeDeCh from '@angular/common/locales/de-CH';

registerLocaleData(localeDeCh);

/**
 * Issue #259: catalog dates were shown one day early. Stored values are date-only
 * strings (e.g. "2026-07-02"), which Angular's DatePipe parses as LOCAL midnight.
 * Passing the "UTC" timezone (as an earlier fix did) then rolls that instant back
 * across midnight for any timezone east of UTC — the previous calendar day. The
 * correct rendering for a date-only value passes NO timezone, so it shows the literal
 * day everywhere. This test locks that in, and documents that "UTC" reintroduces the bug.
 */
describe('date-only rendering (issue #259)', () => {
	const pipe = new DatePipe('de-CH');
	const format = 'd. MMMM y';

	it('renders a date-only string as its literal day when no timezone is forced', () => {
		expect(pipe.transform('2026-07-02', format, undefined, 'de-CH')).toBe('2. Juli 2026');
		expect(pipe.transform('2026-07-05', format, undefined, 'de-CH')).toBe('5. Juli 2026');
		expect(pipe.transform('1997-01-01', format, undefined, 'de-CH')).toBe('1. Januar 1997');
	});

	it('demonstrates that forcing "UTC" shifts a date-only value back one day on a Swiss clock (the bug)', () => {
		// This asserts the WRONG output on purpose, to prove the TZ pin is effective and
		// to pin the reason the templates must not pass "UTC" for date-only fields.
		expect(pipe.transform('2026-07-02', format, 'UTC', 'de-CH')).toBe('1. Juli 2026');
	});
});
