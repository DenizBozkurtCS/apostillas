import { describe, it, expect } from 'vitest';
import { formatDay, formatRating, listName, RATING_STEPS } from './format';

describe('formatDay', () => {
	it('returns an empty string for null, undefined, or empty', () => {
		expect(formatDay(null)).toBe('');
		expect(formatDay(undefined)).toBe('');
		expect(formatDay('')).toBe('');
	});

	it('formats an ISO day and includes the year', () => {
		expect(formatDay('2026-05-01')).toContain('2026');
	});

	it('uses only the day part of a SQLite timestamp', () => {
		expect(formatDay('2026-05-01 13:45:00')).toBe(formatDay('2026-05-01'));
	});

	it('returns the raw day when it cannot be parsed', () => {
		expect(formatDay('not-a-day!')).toBe('not-a-day!');
	});
});

describe('formatRating', () => {
	it('is empty when unrated', () => {
		expect(formatRating(null)).toBe('');
		expect(formatRating(undefined)).toBe('');
	});

	it('writes whole and half ratings', () => {
		expect(formatRating(5)).toBe('5');
		expect(formatRating(4.5)).toBe('4½');
		expect(formatRating(1)).toBe('1');
		expect(formatRating(0.5)).toBe('½');
	});

	it('lists every half step from ½ to 5', () => {
		expect(RATING_STEPS.map(formatRating)).toEqual(['½', '1', '1½', '2', '2½', '3', '3½', '4', '4½', '5']);
	});
});

describe('listName', () => {
	it('shows Want to read as Bookstack and the Finished list as Books', () => {
		expect(listName('Want to read')).toBe('Bookstack');
		expect(listName('Finished')).toBe('Books');
		expect(listName('Reading')).toBe('Reading');
	});
});
