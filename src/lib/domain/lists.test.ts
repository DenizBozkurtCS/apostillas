import { describe, it, expect } from 'vitest';
import { buildLists, currentRating, type BookWithReads } from './lists';
import type { Outcome, Read } from './reading';

/** Build a Read with sensible defaults; override what the test cares about. */
function read(partial: Partial<Read> & { id: number; outcome: Outcome }): Read {
	return { startDate: null, endDate: null, rating: null, readBefore: false, ...partial };
}

/** Build a Book-with-Reads entry; metadata defaults, override as needed. */
function entry(
	id: number,
	reads: Read[],
	over: Partial<BookWithReads['book']> = {}
): BookWithReads {
	return {
		book: {
			id,
			title: `Book ${id}`,
			authors: ['An Author'],
			coverPath: null,
			whyRecommended: null,
			createdAt: '2026-01-01',
			tags: [],
			...over
		},
		reads
	};
}

describe('buildLists', () => {
	it('places each Book under its derived Reading Status', () => {
		const lists = buildLists([
			entry(1, []), // Want to read
			entry(2, [read({ id: 10, outcome: 'open', startDate: '2026-11-01' })]), // Reading
			entry(3, [read({ id: 11, outcome: 'finished', endDate: '2026-10-01' })]), // Finished
			entry(4, [read({ id: 12, outcome: 'abandoned', endDate: '2026-09-01' })]) // Abandoned
		]);

		expect(lists.reading.map((i) => i.bookId)).toEqual([2]);
		expect(lists.wantToRead.map((i) => i.bookId)).toEqual([1]);
		expect(lists.finished.map((i) => i.bookId)).toEqual([3]);
		expect(lists.abandoned.map((i) => i.bookId)).toEqual([4]);
	});

	it('each entry carries cover, title, and authors', () => {
		const lists = buildLists([
			entry(1, [], { title: 'Dune', authors: ['Frank Herbert'], coverPath: 'covers/1.jpg' })
		]);
		const item = lists.wantToRead[0];
		expect(item).toMatchObject({
			bookId: 1,
			title: 'Dune',
			authors: ['Frank Herbert'],
			coverPath: 'covers/1.jpg'
		});
	});

	it('Want to read shows date added and why, newest added first', () => {
		const lists = buildLists([
			entry(1, [], { createdAt: '2026-01-01', whyRecommended: 'A friend' }),
			entry(2, [], { createdAt: '2026-03-01', whyRecommended: null })
		]);
		expect(lists.wantToRead.map((i) => i.bookId)).toEqual([2, 1]);
		expect(lists.wantToRead[1]).toMatchObject({ dateAdded: '2026-01-01', whyRecommended: 'A friend' });
		expect(lists.wantToRead[0].whyRecommended).toBeNull();
	});

	it('Finished is sorted by most recent finish date and shows rating', () => {
		const lists = buildLists([
			entry(1, [read({ id: 10, outcome: 'finished', endDate: '2026-02-01', rating: 4 })]),
			entry(2, [read({ id: 11, outcome: 'finished', endDate: '2026-05-01', rating: 5 })]),
			entry(3, [read({ id: 12, outcome: 'finished', endDate: '2026-03-01', rating: null })])
		]);
		expect(lists.finished.map((i) => i.bookId)).toEqual([2, 3, 1]);
		expect(lists.finished[0]).toMatchObject({ finishDate: '2026-05-01', rating: 5 });
		expect(lists.finished[2].rating).toBe(4);
	});

	it('Finished uses the most recent Finished Read for its finish date and rating', () => {
		const lists = buildLists([
			entry(1, [
				read({ id: 10, outcome: 'finished', endDate: '2026-01-01', rating: 3 }),
				read({ id: 11, outcome: 'finished', endDate: '2026-06-01', rating: 5 })
			])
		]);
		expect(lists.finished[0]).toMatchObject({ finishDate: '2026-06-01', rating: 5, isReread: true });
	});

	it('Finished marks a reread when the latest Finished Read is a Reread', () => {
		const notReread = buildLists([
			entry(1, [read({ id: 10, outcome: 'finished', endDate: '2026-01-01' })])
		]);
		expect(notReread.finished[0].isReread).toBe(false);

		const reread = buildLists([
			entry(1, [read({ id: 10, outcome: 'finished', endDate: '2026-01-01', readBefore: true })])
		]);
		expect(reread.finished[0].isReread).toBe(true);
	});

	it('Abandoned shows the date abandoned, most recent first', () => {
		const lists = buildLists([
			entry(1, [read({ id: 10, outcome: 'abandoned', endDate: '2026-02-01' })]),
			entry(2, [read({ id: 11, outcome: 'abandoned', endDate: '2026-08-01' })])
		]);
		expect(lists.abandoned.map((i) => i.bookId)).toEqual([2, 1]);
		expect(lists.abandoned[0].abandonedDate).toBe('2026-08-01');
	});

	it('a Book Finished once then re-read and abandoned stays Finished, not Abandoned', () => {
		const lists = buildLists([
			entry(1, [
				read({ id: 10, outcome: 'finished', endDate: '2026-01-01' }),
				read({ id: 11, outcome: 'abandoned', endDate: '2026-06-01' })
			])
		]);
		expect(lists.finished.map((i) => i.bookId)).toEqual([1]);
		expect(lists.abandoned).toEqual([]);
	});
});

describe('currentRating', () => {
	it('is the rating of the most recent Finished Read', () => {
		const reads = [
			read({ id: 1, outcome: 'finished', endDate: '2024-01-01', rating: 3 }),
			read({ id: 2, outcome: 'finished', endDate: '2026-01-01', rating: 4.5 }),
			read({ id: 3, outcome: 'abandoned', endDate: '2026-06-01', rating: 1 })
		];
		expect(currentRating(reads)).toBe(4.5);
	});

	it('is null when the most recent Finished Read is unrated, even if an older one is rated', () => {
		const reads = [
			read({ id: 1, outcome: 'finished', endDate: '2024-01-01', rating: 5 }),
			read({ id: 2, outcome: 'finished', endDate: '2026-01-01' })
		];
		expect(currentRating(reads)).toBeNull();
	});

	it('is null with no Finished Read', () => {
		expect(currentRating([read({ id: 1, outcome: 'open', startDate: '2026-01-01' })])).toBeNull();
		expect(currentRating([])).toBeNull();
	});
});
