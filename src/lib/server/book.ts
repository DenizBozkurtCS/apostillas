/**
 * The store-facing side of a single Book page: loading one Book, switching its
 * Reading Statuses and setting its Rating (ADR-0006), editing its metadata,
 * changing its cover, and deleting it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import {
	isValidRating,
	switchStatus,
	type StatusKey,
	type Statuses
} from '../domain/reading';
import type { Db } from './books';
import { parseAuthors } from './books';
import { books, notes, quotes } from './db/schema';
import { downloadCover, writeCover } from './covers';
import { fetchOpenLibraryWork, type BookSearchResult, type FetchLike } from './booksearch';

/** A Book's stored metadata, parsed into the shapes the page uses. */
export interface BookRow {
	id: number;
	title: string;
	authors: string[];
	description: string;
	workId: string | null;
	isbn: string | null;
	pageCount: number | null;
	coverPath: string | null;
	createdAt: string;
	statuses: Statuses;
	/** ½–5, or null when unrated. */
	rating: number | null;
}

/** A Book with everything the Book page needs to render and act. */
export interface BookDetail {
	book: BookRow;
	quoteCount: number;
	noteCount: number;
}

/** Load one Book with its annotation counts, or null if it is gone. */
export function loadBookDetail(db: Db, id: number): BookDetail | null {
	const b = db.select().from(books).where(eq(books.id, id)).get();
	if (!b) return null;

	const count = (table: typeof quotes | typeof notes) =>
		db.select({ n: sql<number>`count(*)` }).from(table).where(eq(table.bookId, id)).get()?.n ?? 0;

	return {
		book: {
			id: b.id,
			title: b.title,
			authors: parseAuthors(b.authors),
			description: b.description,
			workId: b.workId,
			isbn: b.isbn,
			pageCount: b.pageCount,
			coverPath: b.coverPath,
			createdAt: b.createdAt,
			statuses: { want: b.wantSince, reading: b.readingSince, finished: b.finishedSince },
			rating: b.rating
		},
		quoteCount: count(quotes),
		noteCount: count(notes)
	};
}

/** The moment a status is switched on, for ordering the lists. */
export function nowStamp(): string {
	return new Date().toISOString();
}

/**
 * Switch one of a Book's Reading Statuses on or off. The others are left
 * alone. Switching on a status that is already on keeps its original moment.
 */
export function setStatus(db: Db, id: number, key: StatusKey, on: boolean, now = nowStamp()): void {
	const row = db.select().from(books).where(eq(books.id, id)).get();
	if (!row) return;
	const next = switchStatus(
		{ want: row.wantSince, reading: row.readingSince, finished: row.finishedSince },
		key,
		on,
		now
	);
	db
		.update(books)
		.set({ wantSince: next.want, readingSince: next.reading, finishedSince: next.finished })
		.where(eq(books.id, id))
		.run();
}

/**
 * Set a Book's Rating from its stars, which also switches Finished on ("Read
 * it"); or clear it with null, which leaves the statuses alone. An invalid
 * rating is ignored and returns false.
 */
export function rateBook(db: Db, id: number, rating: number | null, now = nowStamp()): boolean {
	if (rating !== null && !isValidRating(rating)) return false;
	db.update(books).set({ rating }).where(eq(books.id, id)).run();
	if (rating !== null) setStatus(db, id, 'finished', true, now);
	return true;
}

/** Which Reading Status a Book should get when it is added. */
export type AddAs = StatusKey;

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

/** Give a just-added Book its starting Reading Status and, if picked, its Rating. */
export function setInitialStatus(db: Db, bookId: number, choice: AddChoice, now = nowStamp()): void {
	setStatus(db, bookId, choice.addAs, true, now);
	if (choice.rating !== null) rateBook(db, bookId, choice.rating, now);
}

/** The editable metadata of a Book (title, authors, description, Edition fields). */
export interface BookMetaInput {
	title: string;
	authors: string[];
	description: string;
	isbn: string | null;
	pageCount: number | null;
}

/** Overwrite a Book's editable metadata. The cover, statuses and Rating are untouched. */
export function updateBookMetadata(db: Db, id: number, input: BookMetaInput): void {
	db
		.update(books)
		.set({
			title: input.title,
			authors: JSON.stringify(input.authors),
			description: input.description,
			isbn: input.isbn,
			pageCount: input.pageCount
		})
		.where(eq(books.id, id))
		.run();
}

/** Looks up an Open Library work's current metadata; null when unavailable. */
export type WorkLookup = (workId: string) => Promise<BookSearchResult | null>;

/**
 * Re-copy a Book's metadata from its Open Library work, undoing local edits to
 * title, authors, description, ISBN and page count. Fields Open Library has no
 * value for keep their current value. The cover is the reader's own choice
 * and is never touched.
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
 * Delete a Book and everything attached to it: its Impressions, Quotes, Notes,
 * Tags and Shelf places (via the schema's cascade) and its stored cover file.
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
