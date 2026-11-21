import { describe, it, expect } from 'vitest';
import { deleteReadMessage, formatDay, formatRating, listName, RATING_STEPS, statusLabel } from './format';

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

describe('deleteReadMessage', () => {
	it('just asks to delete when the Reading Status will not change', () => {
		const msg = deleteReadMessage({
			title: 'Dune',
			currentStatus: 'Finished',
			statusAfterDelete: 'Finished',
			annotationCount: 2
		});
		expect(msg).toContain('Delete this Read');
		expect(msg).not.toContain('move to');
	});

	it('warns about a move to Want to read and that annotations stay', () => {
		const msg = deleteReadMessage({
			title: 'Dune',
			currentStatus: 'Finished',
			statusAfterDelete: 'Want to read',
			annotationCount: 3
		});
		expect(msg).toContain('Dune will move to Bookstack.');
		expect(msg).toContain(
			'Its 3 Quotes and Notes stay, but you can’t add new ones until you start it again.'
		);
	});

	it('warns about the move to Want to read without the annotation clause when there are none', () => {
		const msg = deleteReadMessage({
			title: 'Dune',
			currentStatus: 'Reading',
			statusAfterDelete: 'Want to read',
			annotationCount: 0
		});
		expect(msg).toContain('Dune will move to Bookstack.');
		expect(msg).not.toContain('stay');
	});

	it('names a move to another status without the Want to read clause', () => {
		const msg = deleteReadMessage({
			title: 'Dune',
			currentStatus: 'Reading',
			statusAfterDelete: 'Finished',
			annotationCount: 1
		});
		expect(msg).toContain('Dune will move to Books.');
		expect(msg).not.toContain('start it again');
	});
});

describe('listName and statusLabel', () => {
	it('shows Want to read as Bookstack and the Finished list as Books', () => {
		expect(listName('Want to read')).toBe('Bookstack');
		expect(listName('Finished')).toBe('Books');
		expect(listName('Reading')).toBe('Reading');
		expect(listName('Abandoned')).toBe('Abandoned');
	});

	it('keeps a Finished Book badged as Finished', () => {
		expect(statusLabel('Finished')).toBe('Finished');
		expect(statusLabel('Want to read')).toBe('Bookstack');
	});
});
