import { describe, it, expect } from 'vitest';
import { formatDay, ratingStars } from './format';

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

describe('ratingStars', () => {
	it('is empty when unrated', () => {
		expect(ratingStars(null)).toBe('');
		expect(ratingStars(undefined)).toBe('');
	});

	it('shows filled then empty stars out of five', () => {
		expect(ratingStars(4)).toBe('★★★★☆');
		expect(ratingStars(5)).toBe('★★★★★');
		expect(ratingStars(1)).toBe('★☆☆☆☆');
	});

	it('clamps out-of-range values', () => {
		expect(ratingStars(9)).toBe('★★★★★');
		expect(ratingStars(0)).toBe('☆☆☆☆☆');
	});
});
