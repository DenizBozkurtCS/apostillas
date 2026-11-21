/**
 * The store-facing side of the three Reading Status lists. Reads every Book
 * with its Tags and Impression years, parses the stored shapes into the domain
 * types, and hands them to the pure {@link buildLists}. See
 * src/lib/domain/lists.ts.
 */

import { buildLists, type BookMeta, type Lists } from '../domain/lists';
import type { Db } from './books';
import { parseAuthors } from './books';
import { bookTags, books, impressions } from './db/schema';

/** Build the three lists from the whole store. Single-user, so reading all rows is fine. */
export function getLists(db: Db): Lists {
	return buildLists(loadLibrary(db));
}

function groupBy<T, V>(rows: readonly T[], key: (r: T) => number, value: (r: T) => V): Map<number, V[]> {
	const map = new Map<number, V[]>();
	for (const r of rows) {
		const list = map.get(key(r));
		if (list) list.push(value(r));
		else map.set(key(r), [value(r)]);
	}
	return map;
}

/** Every Book in the library, parsed into the domain shape. */
export function loadLibrary(db: Db): BookMeta[] {
	const bookRows = db.select().from(books).all();
	const tagsByBook = groupBy(db.select().from(bookTags).all(), (t) => t.bookId, (t) => t.name);
	const yearsByBook = groupBy(
		db.select({ bookId: impressions.bookId, date: impressions.date }).from(impressions).all(),
		(i) => i.bookId,
		(i) => Number(i.date.slice(0, 4))
	);

	return bookRows.map((b) => ({
		id: b.id,
		title: b.title,
		authors: parseAuthors(b.authors),
		coverPath: b.coverPath,
		whyRecommended: b.whyRecommended,
		createdAt: b.createdAt,
		tags: (tagsByBook.get(b.id) ?? []).sort(),
		statuses: { want: b.wantSince, reading: b.readingSince, finished: b.finishedSince },
		rating: b.rating,
		impressionYears: [...new Set((yearsByBook.get(b.id) ?? []).filter((y) => y > 0))]
	}));
}
