/**
 * Adding a Book, from a search result or by hand: copy its metadata into our
 * store, store the cover in the data folder, and never create a second Book for
 * a work we already have (ADR-0002, ADR-0003). A freshly added Book has no
 * Reads, so it is Want to read (ADR-0005).
 */

import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { books } from './db/schema';
import {
	fetchOpenLibraryDescription,
	isOpenLibraryWorkId,
	type BookSearchResult,
	type FetchLike
} from './booksearch';
import { downloadCover, writeCover } from './covers';

export type Db = BetterSQLite3Database<typeof schema>;

/** Dependencies for adding a Book, injected so tests can stub I/O. */
export interface AddBookDeps {
	db: Db;
	/** Absolute path to the folder covers are stored in. */
	coversDir: string;
	/** Injectable `fetch` used for the description and cover downloads. */
	fetchImpl?: FetchLike;
}

export interface AddBookInput {
	result: BookSearchResult;
	/** Optional free-text "why / recommended by". */
	whyRecommended?: string | null;
}

/** The added or already-existing Book, and whether this call created it. */
export interface AddBookResult {
	bookId: number;
	created: boolean;
}

/**
 * Add a Book from a search result. If the work is already a Book — same Open
 * Library work ID, or same title + authors — return it instead
 * (`created: false`). For Open Library results the work's description is
 * fetched, since search results don't carry it. The cover is downloaded when
 * the result has one; a failed download is non-fatal.
 */
export async function addBook(deps: AddBookDeps, input: AddBookInput): Promise<AddBookResult> {
	const { db } = deps;
	const { result } = input;
	const fetchImpl = deps.fetchImpl ?? fetch;
	const workId = result.workId && isOpenLibraryWorkId(result.workId) ? result.workId : null;
	const identity = { workId, title: result.title, authors: result.authors };

	const existing = findExistingBook(db, identity);
	if (existing !== null) return { bookId: existing, created: false };

	let description = result.description.trim();
	if (description === '' && workId) {
		description = await fetchOpenLibraryDescription(workId, fetchImpl);
	}

	const added = insertBook(db, identity, {
		title: result.title,
		authors: JSON.stringify(result.authors),
		description,
		workId,
		whyRecommended: blankToNull(input.whyRecommended),
		isbn: result.isbn,
		pageCount: result.pageCount
	});
	if (added.created && result.coverUrl) {
		const coverPath = await downloadCover(deps.coversDir, added.bookId, result.coverUrl, fetchImpl);
		setCover(db, added.bookId, coverPath);
	}
	return added;
}

/** Fields a reader can enter by hand when no search result fits (ADR-0003). */
export interface ManualBookInput {
	title: string;
	/** Author names, in order; may be empty. */
	authors: string[];
	isbn?: string | null;
	pageCount?: number | null;
	description?: string | null;
	/** Optional free-text "why / recommended by". */
	whyRecommended?: string | null;
	/** Raw bytes of an uploaded cover image, if any; ignored unless it is an accepted image. */
	cover?: Uint8Array | null;
}

/**
 * Add a Book the reader typed in by hand. A title + author match against any
 * existing Book (however it was added) opens that Book instead of creating a
 * duplicate (`created: false`). Manual Books have no Open Library work ID.
 */
export function addBookManually(deps: AddBookDeps, input: ManualBookInput): AddBookResult {
	const { db } = deps;
	const title = input.title.trim();
	const authors = input.authors.map((a) => a.trim()).filter((a) => a !== '');
	const identity = { workId: null, title, authors };

	const existing = findExistingBook(db, identity);
	if (existing !== null) return { bookId: existing, created: false };

	const added = insertBook(db, identity, {
		title,
		authors: JSON.stringify(authors),
		description: input.description?.trim() ?? '',
		whyRecommended: blankToNull(input.whyRecommended),
		isbn: blankToNull(input.isbn),
		pageCount: input.pageCount ?? null
	});
	if (added.created && input.cover && input.cover.length > 0) {
		setCover(db, added.bookId, writeCover(deps.coversDir, added.bookId, input.cover));
	}
	return added;
}

/** What makes two Books the same work. */
interface BookIdentity {
	workId: string | null;
	title: string;
	authors: string[];
}

/**
 * The id of the Book that is already this work, or null. A matching Open
 * Library work ID wins; otherwise a normalised title + authors match against
 * every Book, so search-added and hand-entered Books dedupe against each other.
 */
function findExistingBook(db: Db, identity: BookIdentity): number | null {
	if (identity.workId) {
		const byWork = db
			.select({ id: books.id })
			.from(books)
			.where(eq(books.workId, identity.workId))
			.get();
		if (byWork) return byWork.id;
	}

	const key = dedupeKey(identity.title, identity.authors);
	const rows = db.select({ id: books.id, title: books.title, authors: books.authors }).from(books).all();
	for (const row of rows) {
		if (dedupeKey(row.title, parseAuthors(row.authors)) === key) return row.id;
	}
	return null;
}

/**
 * Insert a Book. If the unique work ID index rejects it (the same work was
 * added in the meantime, e.g. a double submit), return the existing Book.
 */
function insertBook(
	db: Db,
	identity: BookIdentity,
	values: typeof books.$inferInsert
): AddBookResult {
	const inserted = db
		.insert(books)
		.values(values)
		.onConflictDoNothing()
		.returning({ id: books.id })
		.get();
	if (inserted) return { bookId: inserted.id, created: true };

	const existing = findExistingBook(db, identity);
	if (existing === null) throw new Error('Book insert was rejected but no existing Book matches');
	return { bookId: existing, created: false };
}

function setCover(db: Db, bookId: number, coverPath: string | null): void {
	if (coverPath) db.update(books).set({ coverPath }).where(eq(books.id, bookId)).run();
}

function blankToNull(value: string | null | undefined): string | null {
	const s = value?.trim();
	return s ? s : null;
}

/** Parse a JSON author array (as stored on a Book or sent by a form), tolerating bad data. */
export function parseAuthors(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		if (Array.isArray(parsed)) return parsed.filter((a): a is string => typeof a === 'string');
	} catch {
		// Fall through to an empty list.
	}
	return [];
}

/**
 * A normalised key for duplicate detection: case-insensitive, whitespace- and
 * order-insensitive across the title and its authors.
 */
function dedupeKey(title: string, authors: string[]): string {
	const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
	const t = norm(title);
	const a = authors
		.map(norm)
		.filter((x) => x !== '')
		.sort()
		.join('|');
	return `${t}::${a}`;
}
