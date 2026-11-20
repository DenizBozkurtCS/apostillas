import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books, reads } from './db/schema';
import { addBook } from './books';
import type { BookSearchResult } from './booksearch';

function testDb(): BetterSQLite3Database<typeof schema> {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

function result(over: Partial<BookSearchResult> = {}): BookSearchResult {
	return {
		source: 'open-library',
		workId: '/works/OL45883W',
		title: 'Dune',
		authors: ['Frank Herbert'],
		firstPublishYear: 1965,
		coverUrl: 'https://covers.openlibrary.org/b/id/8511741-L.jpg',
		isbn: '0441013597',
		pageCount: 412,
		description: 'A desert planet.',
		...over
	};
}

let tmpDir: string;
let coversDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apostillas-test-'));
	coversDir = path.join(tmpDir, 'covers');
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const coverBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const okCover = vi.fn(async () => new Response(coverBytes, { status: 200 }));

describe('addBook', () => {
	it('creates a Want to read Book with metadata copied in and the cover stored', async () => {
		const db = testDb();
		const fetchImpl = okCover;

		const { bookId, created } = await addBook(
			{ db, coversDir, fetchImpl },
			{ result: result(), whyRecommended: 'Recommended by a friend' }
		);

		expect(created).toBe(true);
		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.title).toBe('Dune');
		expect(JSON.parse(row.authors)).toEqual(['Frank Herbert']);
		expect(row.workId).toBe('/works/OL45883W');
		expect(row.description).toBe('A desert planet.');
		expect(row.isbn).toBe('0441013597');
		expect(row.pageCount).toBe(412);
		expect(row.whyRecommended).toBe('Recommended by a friend');

		// A new Book has no Reads, so it is Want to read (ADR-0005).
		expect(db.select().from(reads).where(eq(reads.bookId, bookId)).all()).toEqual([]);

		// The cover was downloaded into the data folder and recorded.
		expect(row.coverPath).toBeTruthy();
		const onDisk = path.join(tmpDir, row.coverPath!);
		expect(fs.existsSync(onDisk)).toBe(true);
		expect(new Uint8Array(fs.readFileSync(onDisk))).toEqual(coverBytes);
	});

	it('does not create a duplicate when the Open Library work ID already exists', async () => {
		const db = testDb();
		const fetchImpl = okCover;

		const first = await addBook({ db, coversDir, fetchImpl }, { result: result() });
		const second = await addBook(
			{ db, coversDir, fetchImpl },
			{ result: result({ title: 'Dune (reissue)' }) }
		);

		expect(second.created).toBe(false);
		expect(second.bookId).toBe(first.bookId);
		expect(db.select().from(books).all()).toHaveLength(1);
	});

	it('creates separate Books for Google Books results, which have no work ID', async () => {
		const db = testDb();
		const fetchImpl = okCover;
		const g = result({ source: 'google-books', workId: null, coverUrl: null });

		const first = await addBook({ db, coversDir, fetchImpl }, { result: g });
		const second = await addBook({ db, coversDir, fetchImpl }, { result: g });

		expect(first.bookId).not.toBe(second.bookId);
		expect(db.select().from(books).all()).toHaveLength(2);
	});

	it('still creates the Book when the cover download fails', async () => {
		const db = testDb();
		const fetchImpl = vi.fn(async () => new Response('nope', { status: 404 }));

		const { bookId, created } = await addBook(
			{ db, coversDir, fetchImpl },
			{ result: result() }
		);

		expect(created).toBe(true);
		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.coverPath).toBeNull();
	});
});
