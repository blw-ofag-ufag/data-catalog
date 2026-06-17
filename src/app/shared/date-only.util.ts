/**
 * Parse a date-only value (e.g. "2024-01-15" from a dataset JSON) into a local-time
 * Date. Using `new Date("2024-01-15")` parses as UTC midnight, which renders/validates
 * as the previous day in timezones west of UTC (issue #259). Building the Date from
 * explicit local parts avoids that off-by-one. Falls back to the native parser for any
 * value that is not a plain date-only string (e.g. full ISO date-times).
 */
export function parseLocalDate(value: string | Date | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	if (value instanceof Date) {
		return value;
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
	if (match) {
		return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	}
	const parsed = new Date(value);
	return isNaN(parsed.getTime()) ? null : parsed;
}
