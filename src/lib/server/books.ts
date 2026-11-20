/**
 * Adding a Book from a search result: copy its metadata into our store, store
 * the Open Library work ID, download its cover into the data folder, and avoid
 * duplicates (ADR-0003). A freshly added Book has no Reads, so it is Want to
 * read (ADR-0005).
 */

import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { books } from './db/schema';
import type { BookSearchResult, FetchLike } from './booksearch';

export type Db = BetterSQLite3Database<typeof schema>;

/** Dependencies for {@link addBook}, injected so tests can stub I/O. */
export interface AddBookDeps {
	db: Db;
	/** Absolute path to the folder covers are downloaded into. */
	coversDir: string;
	/** Injectable `fetch` used to download the cover. */
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
 * Add a Book from a search result. If a Book with the same Open Library work ID
 * already exists, return it instead of creating a duplicate (`created: false`).
 * The cover, when the result has one, is downloaded into {@link AddBookDeps.coversDir};
 * a failed download is non-fatal — the Book is still created without a cover.
 */
export async function addBook(deps: AddBookDeps, input: AddBookInput): Promise<AddBookResult> {
	const { db } = deps;
	const { result } = input;

	// Dedupe by Open Library work ID (Google Books results have none).
	if (result.workId) {
		const existing = db
			.select({ id: books.id })
			.from(books)
			.where(eq(books.workId, result.workId))
			.get();
		if (existing) return { bookId: existing.id, created: false };
	}

	const why = input.whyRecommended?.trim();
	const inserted = db
		.insert(books)
		.values({
			title: result.title,
			authors: JSON.stringify(result.authors),
			description: result.description,
			workId: result.workId,
			whyRecommended: why ? why : null,
			isbn: result.isbn,
			pageCount: result.pageCount
		})
		.returning({ id: books.id })
		.get();
	const bookId = inserted.id;

	if (result.coverUrl) {
		const coverPath = await downloadCover(deps, bookId, result.coverUrl);
		if (coverPath) {
			db.update(books).set({ coverPath }).where(eq(books.id, bookId)).run();
		}
	}

	return { bookId, created: true };
}

/**
 * Download a cover into the covers folder, named by Book id. Returns the path
 * relative to the data folder (e.g. `covers/5.jpg`) to store on the Book, or
 * null if the download failed — covers are best-effort, not required.
 */
async function downloadCover(
	deps: AddBookDeps,
	bookId: number,
	coverUrl: string
): Promise<string | null> {
	const fetchImpl = deps.fetchImpl ?? fetch;
	try {
		const res = await fetchImpl(coverUrl);
		if (!res.ok) return null;
		const bytes = Buffer.from(await res.arrayBuffer());
		if (bytes.length === 0) return null;
		fs.mkdirSync(deps.coversDir, { recursive: true });
		const fileName = `${bookId}.jpg`;
		fs.writeFileSync(path.join(deps.coversDir, fileName), bytes);
		return path.posix.join('covers', fileName);
	} catch {
		return null;
	}
}
