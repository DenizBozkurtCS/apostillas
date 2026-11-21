/**
 * Pure categorisation of Books into the three Reading Status lists (Reading,
 * Want to read, Finished) that the app's screens show. See GLOSSARY.md and
 * docs/adr/0006: statuses are independent, so a Book sits on every list whose
 * status it has, and on none when it has none.
 *
 * This module is pure: it never touches the database. The server layer reads
 * the Books and hands them here.
 */

import type { Statuses } from './reading';

/** The Book data each list entry needs. */
export interface BookMeta {
	id: number;
	title: string;
	authors: string[];
	/** Path to the stored cover relative to the data folder, or null. */
	coverPath: string | null;
	/** Free-text "why / recommended by"; shown on Bookstack. */
	whyRecommended: string | null;
	/** Date the Book was added (ISO). */
	createdAt: string;
	/** The Book's Tags (normalised names), alphabetically. */
	tags: string[];
	statuses: Statuses;
	/** The Book's Rating, ½–5 or null. */
	rating: number | null;
	/** Distinct years of the Book's Impressions, for the Books year filter. */
	impressionYears: number[];
}

/** Fields common to every list entry: enough to show a card that links to the Book. */
export interface BaseItem {
	bookId: number;
	title: string;
	authors: string[];
	coverPath: string | null;
	tags: string[];
}

export type ReadingItem = BaseItem;

export interface WantToReadItem extends BaseItem {
	whyRecommended: string | null;
}

export interface FinishedItem extends BaseItem {
	rating: number | null;
	/** Years the Book has Impressions in. */
	years: number[];
}

/** The three lists, one per Reading Status. */
export interface Lists {
	reading: ReadingItem[];
	wantToRead: WantToReadItem[];
	finished: FinishedItem[];
}

function base(book: BookMeta): BaseItem {
	return {
		bookId: book.id,
		title: book.title,
		authors: book.authors,
		coverPath: book.coverPath,
		tags: book.tags
	};
}

/** Most recently switched on first; ties broken by newest Book first. */
function bySinceDesc(since: (b: BookMeta) => string | null) {
	return (a: BookMeta, b: BookMeta): number => {
		const as = since(a) ?? '';
		const bs = since(b) ?? '';
		if (as !== bs) return as < bs ? 1 : -1;
		return b.id - a.id;
	};
}

/**
 * Put every Book on each list whose status it has, each list in its default
 * order: most recently switched on first ("recently started", "recently
 * added", "recently finished").
 */
export function buildLists(input: readonly BookMeta[]): Lists {
	const on = (key: keyof Statuses) =>
		input.filter((b) => b.statuses[key] !== null).sort(bySinceDesc((b) => b.statuses[key]));

	return {
		reading: on('reading').map(base),
		wantToRead: on('want').map((b) => ({ ...base(b), whyRecommended: b.whyRecommended })),
		finished: on('finished').map((b) => ({ ...base(b), rating: b.rating, years: b.impressionYears }))
	};
}
