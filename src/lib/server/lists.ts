/**
 * The store-facing side of the four Reading Status lists. Reads every Book and
 * its Reads from the database, parses the stored shapes into the domain types,
 * and hands them to the pure {@link buildLists} so the list rules stay in one
 * tested place. See src/lib/domain/lists.ts.
 */

import { buildLists, type BookWithReads, type Lists } from '../domain/lists';
import type { Read } from '../domain/reading';
import type { Db } from './books';
import { books, reads } from './db/schema';

/** Parse a Book's stored JSON author array, tolerating bad data. */
function parseAuthors(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		if (Array.isArray(parsed)) return parsed.filter((a): a is string => typeof a === 'string');
	} catch {
		/* fall through */
	}
	return [];
}

/** Build the four lists from the whole store. Single-user, so reading all rows is fine. */
export function getLists(db: Db): Lists {
	const bookRows = db.select().from(books).all();
	const readRows = db.select().from(reads).all();

	const readsByBook = new Map<number, Read[]>();
	for (const r of readRows) {
		const read: Read = {
			id: r.id,
			startDate: r.startDate,
			endDate: r.endDate,
			outcome: r.outcome,
			rating: r.rating,
			readBefore: r.readBefore
		};
		const list = readsByBook.get(r.bookId);
		if (list) list.push(read);
		else readsByBook.set(r.bookId, [read]);
	}

	const input: BookWithReads[] = bookRows.map((b) => ({
		book: {
			id: b.id,
			title: b.title,
			authors: parseAuthors(b.authors),
			coverPath: b.coverPath,
			whyRecommended: b.whyRecommended,
			createdAt: b.createdAt
		},
		reads: readsByBook.get(b.id) ?? []
	}));

	return buildLists(input);
}
