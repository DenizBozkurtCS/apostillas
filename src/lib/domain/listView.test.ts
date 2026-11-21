import { describe, it, expect } from 'vitest';
import {
	NO_FILTER,
	filterItems,
	impressionYears,
	isFiltering,
	sortItems,
	tagsIn,
	type ViewItem
} from './listView';

function item(bookId: number, over: Partial<ViewItem> = {}): ViewItem {
	return {
		bookId,
		title: `Book ${bookId}`,
		authors: ['An Author'],
		coverPath: null,
		tags: [],
		...over
	};
}

const dune = item(1, {
	title: 'Dune',
	authors: ['Frank Herbert'],
	tags: ['scifi', 'classic'],
	rating: 5,
	years: [2025]
});
const emma = item(2, {
	title: 'Emma',
	authors: ['Jane Austen'],
	tags: ['classic'],
	rating: 3.5,
	years: [2024, 2026]
});
const solaris = item(3, {
	title: 'Solaris',
	authors: ['Stanisław Lem'],
	tags: ['scifi'],
	rating: null,
	years: []
});
const cien = item(4, { title: 'Cien años de soledad', authors: ['Gabriel García Márquez'], rating: 4 });
const all = [dune, emma, solaris, cien];
const ids = (xs: ViewItem[]) => xs.map((x) => x.bookId);

describe('filterItems', () => {
	it('passes everything with no filter', () => {
		expect(ids(filterItems(all, NO_FILTER))).toEqual([1, 2, 3, 4]);
		expect(isFiltering(NO_FILTER)).toBe(false);
	});

	it('matches every word against title and authors, ignoring case and accents', () => {
		const f = (text: string) => ids(filterItems(all, { ...NO_FILTER, text }));
		expect(f('herbert')).toEqual([1]);
		expect(f('DUNE')).toEqual([1]);
		expect(f('garcia')).toEqual([4]);
		expect(f('lem solaris')).toEqual([3]);
		expect(f('lem dune')).toEqual([]);
	});

	it('matches any of several Tags', () => {
		expect(ids(filterItems(all, { ...NO_FILTER, tags: ['scifi'] }))).toEqual([1, 3]);
		expect(ids(filterItems(all, { ...NO_FILTER, tags: ['scifi', 'classic'] }))).toEqual([1, 2, 3]);
	});

	it('filters by minimum rating, leaving out unrated Books', () => {
		expect(ids(filterItems(all, { ...NO_FILTER, minRating: 4 }))).toEqual([1, 4]);
	});

	it('filters by a year the Book has an Impression in', () => {
		expect(ids(filterItems(all, { ...NO_FILTER, year: 2026 }))).toEqual([2]);
	});

	it('combines different filters with AND', () => {
		const f = { text: 'herbert', tags: ['scifi', 'classic'], minRating: 4, year: null };
		expect(ids(filterItems(all, f))).toEqual([1]);
		expect(ids(filterItems(all, { ...f, text: 'austen' }))).toEqual([]);
		expect(isFiltering(f)).toBe(true);
	});
});

describe('sortItems', () => {
	it('keeps the incoming order for recent', () => {
		expect(ids(sortItems(all, 'recent'))).toEqual([1, 2, 3, 4]);
	});

	it('sorts by title A–Z', () => {
		expect(ids(sortItems(all, 'title'))).toEqual([4, 1, 2, 3]);
	});

	it('sorts by the first author’s surname', () => {
		// Austen, Herbert, Lem, Márquez
		expect(ids(sortItems(all, 'author'))).toEqual([2, 1, 3, 4]);
	});

	it('sorts by rating high to low, unrated last, ties in incoming order', () => {
		const tie = item(5, { rating: 5 });
		expect(ids(sortItems([...all, tie], 'rating'))).toEqual([1, 5, 4, 2, 3]);
	});

	it('does not change the input', () => {
		const input = [...all];
		sortItems(input, 'title');
		expect(ids(input)).toEqual([1, 2, 3, 4]);
	});
});

describe('impressionYears / tagsIn', () => {
	it('lists distinct years newest first and Tags alphabetically', () => {
		expect(impressionYears(all)).toEqual([2026, 2025, 2024]);
		expect(tagsIn(all)).toEqual(['classic', 'scifi']);
	});
});
