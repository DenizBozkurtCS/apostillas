/**
 * Pure categorisation of Books into the four Reading Status lists (Reading,
 * Want to read, Finished, Abandoned) that the app's screens show. See
 * GLOSSARY.md for the vocabulary and docs/adr/0005 for the derivation rules.
 *
 * This module is pure: it never touches the database. The server layer reads
 * Books and their Reads and hands them here; the list rules live in one tested
 * place, reusing {@link readingStatus} and {@link isReread} from ./reading.
 */

import { isReread, readingStatus, type Outcome, type Read } from './reading';

/** The Book metadata each list entry needs. */
export interface BookMeta {
	id: number;
	title: string;
	authors: string[];
	/** Path to the stored cover relative to the data folder, or null. */
	coverPath: string | null;
	/** Free-text "why / recommended by"; only shown on Want to read. */
	whyRecommended: string | null;
	/** Date the Book was added (ISO), shown on Want to read. */
	createdAt: string;
}

/** A Book together with all of its Reads, as read from the store. */
export interface BookWithReads {
	book: BookMeta;
	reads: Read[];
}

/** Fields common to every list entry: enough to show a card that links to the Book. */
export interface BaseItem {
	bookId: number;
	title: string;
	authors: string[];
	coverPath: string | null;
}

export interface ReadingItem extends BaseItem {}

export interface WantToReadItem extends BaseItem {
	dateAdded: string;
	whyRecommended: string | null;
}

export interface FinishedItem extends BaseItem {
	/** End date of the most recent Finished Read. */
	finishDate: string | null;
	/** Rating of the most recent Finished Read, ½–5 or null. */
	rating: number | null;
	/** Whether that most recent Finished Read is a Reread. */
	isReread: boolean;
}

export interface AbandonedItem extends BaseItem {
	/** End date of the most recent Abandoned Read. */
	abandonedDate: string | null;
}

/** The four lists, one per Reading Status. */
export interface Lists {
	reading: ReadingItem[];
	wantToRead: WantToReadItem[];
	finished: FinishedItem[];
	abandoned: AbandonedItem[];
}

function base(book: BookMeta): BaseItem {
	return { bookId: book.id, title: book.title, authors: book.authors, coverPath: book.coverPath };
}

/** Compare two end dates (nulls sort earliest), ascending; ties broken by id. */
function compareEnd(a: Read, b: Read): number {
	const ae = a.endDate ?? '';
	const be = b.endDate ?? '';
	if (ae !== be) return ae < be ? -1 : 1;
	return a.id - b.id;
}

/** The Read of the given outcome with the most recent end date (tie: newest id). */
function mostRecent(reads: readonly Read[], outcome: Outcome): Read | null {
	let best: Read | null = null;
	for (const r of reads) {
		if (r.outcome !== outcome) continue;
		if (best === null || compareEnd(r, best) > 0) best = r;
	}
	return best;
}

/**
 * A Book's current rating: the rating of its most recent Finished Read, or null
 * when it has no Finished Read or that Read is unrated. The Books list and the
 * Book page both show this one.
 */
export function currentRating(reads: readonly Read[]): number | null {
	return mostRecent(reads, 'finished')?.rating ?? null;
}

/** Descending string compare with nulls last; ties broken by bookId descending. */
function byDateDesc<T extends { bookId: number }>(date: (i: T) => string | null) {
	return (a: T, b: T): number => {
		const ad = date(a) ?? '';
		const bd = date(b) ?? '';
		if (ad !== bd) return ad < bd ? 1 : -1;
		return b.bookId - a.bookId;
	};
}

/**
 * Sort every Book into its Reading Status list and attach the per-list details
 * each screen shows. Finished is newest-finish-first; Want to read and
 * Abandoned are newest-first too; Reading is newest-added-first.
 */
export function buildLists(input: readonly BookWithReads[]): Lists {
	const reading: ReadingItem[] = [];
	const wantToRead: WantToReadItem[] = [];
	const finished: FinishedItem[] = [];
	const abandoned: AbandonedItem[] = [];

	for (const { book, reads } of input) {
		switch (readingStatus(reads)) {
			case 'Reading':
				reading.push(base(book));
				break;
			case 'Want to read':
				wantToRead.push({
					...base(book),
					dateAdded: book.createdAt,
					whyRecommended: book.whyRecommended
				});
				break;
			case 'Finished': {
				const latest = mostRecent(reads, 'finished')!;
				finished.push({
					...base(book),
					finishDate: latest.endDate,
					rating: currentRating(reads),
					isReread: isReread(latest, reads)
				});
				break;
			}
			case 'Abandoned': {
				const latest = mostRecent(reads, 'abandoned')!;
				abandoned.push({ ...base(book), abandonedDate: latest.endDate });
				break;
			}
		}
	}

	reading.sort((a, b) => b.bookId - a.bookId);
	wantToRead.sort(byDateDesc((i) => i.dateAdded));
	finished.sort(byDateDesc((i) => i.finishDate));
	abandoned.sort(byDateDesc((i) => i.abandonedDate));

	return { reading, wantToRead, finished, abandoned };
}
