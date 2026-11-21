/**
 * The store-facing side of a single Book page: loading one Book with its Reads
 * and annotation counts, applying a Read {@link Mutation} from the pure domain,
 * editing the Book's metadata, changing its cover, and deleting it.
 *
 * The domain module (src/lib/domain/reading.ts) decides *what* changes; this
 * module only applies the change. Read mutations are scoped to the Book so a
 * forged Read id from the browser cannot touch another Book's Reads.
 */

import fs from 'node:fs';
import path from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { isValidRating, logPastFinished, start, type Mutation, type Read } from '../domain/reading';
import type { Db } from './books';
import { parseAuthors } from './books';
import { books, notes, quotes, reads } from './db/schema';
import { downloadCover, writeCover } from './covers';
import { fetchOpenLibraryWork, type BookSearchResult, type FetchLike } from './booksearch';

/** A Book's stored metadata, parsed into the shapes the page uses. */
export interface BookRow {
	id: number;
	title: string;
	authors: string[];
	description: string;
	workId: string | null;
	whyRecommended: string | null;
	isbn: string | null;
	pageCount: number | null;
	coverPath: string | null;
	createdAt: string;
}

/** A Book with everything the Book page needs to render and act. */
export interface BookDetail {
	book: BookRow;
	reads: Read[];
	/** Number of Quotes on the Book, for the delete-a-Read warning. */
	quoteCount: number;
	/** Number of Notes on the Book, for the delete-a-Read warning. */
	noteCount: number;
}

function rowToRead(r: typeof reads.$inferSelect): Read {
	return {
		id: r.id,
		startDate: r.startDate,
		endDate: r.endDate,
		outcome: r.outcome,
		rating: r.rating,
		readBefore: r.readBefore
	};
}

/** Load one Book with its Reads and annotation counts, or null if it is gone. */
export function loadBookDetail(db: Db, id: number): BookDetail | null {
	const b = db.select().from(books).where(eq(books.id, id)).get();
	if (!b) return null;

	const readRows = db.select().from(reads).where(eq(reads.bookId, id)).all();
	const count = (table: typeof quotes | typeof notes) =>
		db.select({ n: sql<number>`count(*)` }).from(table).where(eq(table.bookId, id)).get()?.n ?? 0;

	return {
		book: {
			id: b.id,
			title: b.title,
			authors: parseAuthors(b.authors),
			description: b.description,
			workId: b.workId,
			whyRecommended: b.whyRecommended,
			isbn: b.isbn,
			pageCount: b.pageCount,
			coverPath: b.coverPath,
			createdAt: b.createdAt
		},
		reads: readRows.map(rowToRead),
		quoteCount: count(quotes),
		noteCount: count(notes)
	};
}

/**
 * Apply a domain {@link Mutation} to a Book's Reads. Updates and deletes are
 * scoped to `bookId`. Deleting a Read relies on the schema's `read_id → null`
 * foreign key to unlink its Quotes and Notes, keeping them on the Book.
 */
export function applyReadMutation(db: Db, bookId: number, mutation: Mutation): void {
	switch (mutation.kind) {
		case 'insert':
			db.insert(reads).values({ bookId, ...mutation.read }).run();
			return;
		case 'update':
			db
				.update(reads)
				.set(mutation.patch)
				.where(and(eq(reads.id, mutation.id), eq(reads.bookId, bookId)))
				.run();
			return;
		case 'delete':
			db.delete(reads).where(and(eq(reads.id, mutation.id), eq(reads.bookId, bookId))).run();
			return;
	}
}

/** Which Reading Status a Book should land in when it is added. */
export type AddAs = 'want' | 'reading' | 'finished';

/** How the reader chose to add a Book: its starting status and, for Finished, a rating. */
export interface AddChoice {
	addAs: AddAs;
	rating: number | null;
}

/**
 * Read the add choice from an Add book form. Clicking a star sends `rating`
 * (½–5), which means "read it, with this rating"; otherwise `addAs` names
 * the status. Anything unexpected means Want to read.
 */
export function parseAddChoice(form: FormData): AddChoice {
	const rating = Number(form.get('rating'));
	if (isValidRating(rating)) {
		return { addAs: 'finished', rating };
	}
	const addAs = form.get('addAs');
	return { addAs: addAs === 'reading' || addAs === 'finished' ? addAs : 'want', rating: null };
}

/** Today as an ISO day (`YYYY-MM-DD`) in the server's local time. */
export function todayISO(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Give a just-added Book (which has no Reads) its starting Reading Status:
 * Reading starts a Read today, Finished logs a Finished Read ending today, and
 * Want to read adds nothing. Dates and rating can be edited on the Book page.
 */
export function setInitialStatus(
	db: Db,
	bookId: number,
	addAs: AddAs,
	today: string,
	rating: number | null = null
): void {
	if (addAs === 'want') return;
	const op =
		addAs === 'reading' ? start([], today) : logPastFinished([], { endDate: today, rating });
	if (op.ok) applyReadMutation(db, bookId, op.mutation);
}

/** The editable metadata of a Book (title, authors, Edition fields, "why"). */
export interface BookMetaInput {
	title: string;
	authors: string[];
	description: string;
	isbn: string | null;
	pageCount: number | null;
	whyRecommended: string | null;
}

/** Overwrite a Book's editable metadata. The cover and Reads are untouched. */
export function updateBookMetadata(db: Db, id: number, input: BookMetaInput): void {
	db
		.update(books)
		.set({
			title: input.title,
			authors: JSON.stringify(input.authors),
			description: input.description,
			isbn: input.isbn,
			pageCount: input.pageCount,
			whyRecommended: input.whyRecommended
		})
		.where(eq(books.id, id))
		.run();
}

/** Looks up an Open Library work's current metadata; null when unavailable. */
export type WorkLookup = (workId: string) => Promise<BookSearchResult | null>;

/**
 * Re-copy a Book's metadata from its Open Library work, undoing local edits to
 * title, authors, description, ISBN and page count. Fields Open Library has no
 * value for keep their current value. "Why / recommended by" and the cover
 * are the reader's own choices and are never touched.
 */
export async function syncBookMetadata(
	db: Db,
	id: number,
	lookup: WorkLookup = (workId) => fetchOpenLibraryWork(workId)
): Promise<'synced' | 'no-source' | 'unavailable'> {
	const row = db.select().from(books).where(eq(books.id, id)).get();
	if (!row?.workId) return 'no-source';

	const work = await lookup(row.workId);
	if (!work || work.title === '') return 'unavailable';

	db
		.update(books)
		.set({
			title: work.title,
			authors: JSON.stringify(work.authors),
			description: work.description !== '' ? work.description : row.description,
			isbn: work.isbn ?? row.isbn,
			pageCount: work.pageCount ?? row.pageCount
		})
		.where(eq(books.id, id))
		.run();
	return 'synced';
}

/** Remove a stored cover file (named `<id>.<ext>`) from the covers folder. */
function removeCoverFile(coversDir: string, coverPath: string | null): void {
	if (!coverPath) return;
	fs.rmSync(path.join(coversDir, path.basename(coverPath)), { force: true });
}

/**
 * Delete a Book and everything attached to it: its Reads, Quotes and Notes
 * (via the schema's cascade) and its stored cover file.
 */
export function deleteBook(db: Db, coversDir: string, id: number): void {
	const coverPath = db.select({ coverPath: books.coverPath }).from(books).where(eq(books.id, id)).get()?.coverPath;
	db.delete(books).where(eq(books.id, id)).run();
	removeCoverFile(coversDir, coverPath ?? null);
}

/** Record a freshly written cover and delete the old file when it is a different name. */
function recordNewCover(db: Db, coversDir: string, id: number, newPath: string): string {
	const oldPath = db.select({ coverPath: books.coverPath }).from(books).where(eq(books.id, id)).get()?.coverPath ?? null;
	db.update(books).set({ coverPath: newPath }).where(eq(books.id, id)).run();
	if (oldPath && oldPath !== newPath) removeCoverFile(coversDir, oldPath);
	return newPath;
}

/**
 * Replace a Book's cover with uploaded bytes, validated like any other cover
 * (JPEG/PNG/GIF/WebP, max 5 MB). Returns the new stored path, or null when the
 * bytes are not an accepted image.
 */
export function setBookCoverFromBytes(
	db: Db,
	coversDir: string,
	id: number,
	bytes: Uint8Array
): string | null {
	const newPath = writeCover(coversDir, id, bytes);
	if (!newPath) return null;
	return recordNewCover(db, coversDir, id, newPath);
}

/**
 * Replace a Book's cover with one downloaded from a provider cover host (an
 * edition cover). Returns the new stored path, or null when the URL is not
 * trusted or the download is not an acceptable image.
 */
export async function setBookCoverFromUrl(
	db: Db,
	coversDir: string,
	id: number,
	coverUrl: string,
	fetchImpl: FetchLike = fetch
): Promise<string | null> {
	const newPath = await downloadCover(coversDir, id, coverUrl, fetchImpl);
	if (!newPath) return null;
	return recordNewCover(db, coversDir, id, newPath);
}
