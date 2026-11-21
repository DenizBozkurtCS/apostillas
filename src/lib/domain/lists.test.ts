import { describe, it, expect } from 'vitest';
import { buildLists, type BookMeta } from './lists';
import { NO_STATUSES, type Statuses } from './reading';

/** Build a Book with sensible defaults; override what the test cares about. */
function book(id: number, statuses: Partial<Statuses>, over: Partial<BookMeta> = {}): BookMeta {
	return {
		id,
		title: `Book ${id}`,
		authors: ['An Author'],
		coverPath: null,
		description: '',
		isbn: null,
		createdAt: '2026-01-01',
		tags: [],
		statuses: { ...NO_STATUSES, ...statuses },
		rating: null,
		impressionYears: [],
		...over
	};
}

const T = (day: number) => `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`;

describe('buildLists', () => {
	it('puts each Book on every list whose status it has', () => {
		const lists = buildLists([
			book(1, { want: T(1) }),
			book(2, { reading: T(1), finished: T(1) }),
			book(3, { want: T(1), reading: T(1), finished: T(1) }),
			book(4, {})
		]);
		expect(lists.wantToRead.map((i) => i.bookId).sort()).toEqual([1, 3]);
		expect(lists.reading.map((i) => i.bookId).sort()).toEqual([2, 3]);
		expect(lists.finished.map((i) => i.bookId).sort()).toEqual([2, 3]);
	});

	it('leaves a Book with no status off every list', () => {
		const lists = buildLists([book(1, {})]);
		expect([lists.reading, lists.wantToRead, lists.finished]).toEqual([[], [], []]);
	});

	it('orders each list by when its status was switched on, newest first, ties by newest Book', () => {
		const lists = buildLists([
			book(1, { reading: T(3) }),
			book(2, { reading: T(5) }),
			book(3, { reading: T(3) })
		]);
		expect(lists.reading.map((i) => i.bookId)).toEqual([2, 3, 1]);
	});

	it('carries the details each list shows', () => {
		const lists = buildLists([
			book(1, { want: T(1), finished: T(1) }, { rating: 4.5, impressionYears: [2025], tags: ['scifi'] })
		]);
		expect(lists.wantToRead[0]).toMatchObject({ tags: ['scifi'] });
		expect(lists.finished[0]).toMatchObject({ rating: 4.5, years: [2025] });
	});
});
