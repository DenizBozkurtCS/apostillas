import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books } from './db/schema';
import { addBook, addBookManually } from './books';
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

const coverBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const okCover = vi.fn(async () => new Response(coverBytes, { status: 200 }));

describe('addBook', () => {
	it('creates a Want to read Book with metadata copied in and the cover stored', async () => {
		const db = testDb();
		const fetchImpl = okCover;

		const { bookId, created } = await addBook(
			{ db, coversDir, fetchImpl },
			{ result: result() }
		);

		expect(created).toBe(true);
		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.title).toBe('Dune');
		expect(JSON.parse(row.authors)).toEqual(['Frank Herbert']);
		expect(row.workId).toBe('/works/OL45883W');
		expect(row.description).toBe('A desert planet.');
		expect(row.isbn).toBe('0441013597');
		expect(row.pageCount).toBe(412);

		// The Add page sets the starting status separately (setInitialStatus).
		expect([row.wantSince, row.readingSince, row.finishedSince, row.rating]).toEqual([null, null, null, null]);

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

	it('opens the existing Book when the same Google Books result is added twice', async () => {
		const db = testDb();
		const fetchImpl = okCover;
		const g = result({ source: 'google-books', workId: null, coverUrl: null });

		const first = await addBook({ db, coversDir, fetchImpl }, { result: g });
		const second = await addBook({ db, coversDir, fetchImpl }, { result: g });

		expect(second.created).toBe(false);
		expect(second.bookId).toBe(first.bookId);
		expect(db.select().from(books).all()).toHaveLength(1);
	});

	it('opens a hand-entered Book when an Open Library result matches its title + authors', async () => {
		const db = testDb();
		const manual = addBookManually({ db, coversDir }, { title: 'dune', authors: ['Frank Herbert'] });

		const fromSearch = await addBook({ db, coversDir, fetchImpl: okCover }, { result: result() });

		expect(fromSearch).toEqual({ bookId: manual.bookId, created: false });
		expect(db.select().from(books).all()).toHaveLength(1);
	});

	it('enforces one Book per work ID in the database', () => {
		const db = testDb();
		db.insert(books).values({ title: 'Dune', workId: '/works/OL45883W' }).run();

		expect(() =>
			db.insert(books).values({ title: 'Other', workId: '/works/OL45883W' }).run()
		).toThrow(/UNIQUE/);
		// Books without a work ID never collide.
		db.insert(books).values({ title: 'A' }).run();
		db.insert(books).values({ title: 'B' }).run();
	});

	it('fetches the work description for an Open Library result that has none', async () => {
		const db = testDb();
		const fetchImpl = vi.fn(async (url: string) =>
			url === 'https://openlibrary.org/works/OL45883W.json'
				? Response.json({ description: { type: '/type/text', value: 'Spice and sand.' } })
				: new Response(coverBytes)
		);

		const { bookId } = await addBook(
			{ db, coversDir, fetchImpl },
			{ result: result({ description: '' }) }
		);

		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.description).toBe('Spice and sand.');
	});

	it('drops a work ID that is not an Open Library work ID', async () => {
		const db = testDb();
		const { bookId } = await addBook(
			{ db, coversDir, fetchImpl: okCover },
			{ result: result({ workId: '/../../admin' }) }
		);

		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.workId).toBeNull();
	});

	it('does not download a cover from a host that is not a provider cover host', async () => {
		const db = testDb();
		const fetchImpl = vi.fn(async () => new Response(coverBytes));

		const { bookId } = await addBook(
			{ db, coversDir, fetchImpl },
			{ result: result({ coverUrl: 'http://169.254.169.254/latest/meta-data' }) }
		);

		expect(fetchImpl).not.toHaveBeenCalled();
		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.coverPath).toBeNull();
	});

	it('does not store a downloaded cover that is not an image', async () => {
		const db = testDb();
		const fetchImpl = vi.fn(async () => new Response('<html>hi</html>'));

		const { bookId } = await addBook({ db, coversDir, fetchImpl }, { result: result() });

		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.coverPath).toBeNull();
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

describe('addBookManually', () => {
	it('creates a Want to read Book from hand-entered fields and stores an uploaded cover', async () => {
		const db = testDb();

		const { bookId, created } = await addBookManually(
			{ db, coversDir },
			{
				title: 'The Dispossessed',
				authors: ['Ursula K. Le Guin'],
				isbn: '0060512750',
				pageCount: 387,
				description: 'An ambiguous utopia.',
				cover: coverBytes
			}
		);

		expect(created).toBe(true);
		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.title).toBe('The Dispossessed');
		expect(JSON.parse(row.authors)).toEqual(['Ursula K. Le Guin']);
		expect(row.isbn).toBe('0060512750');
		expect(row.pageCount).toBe(387);
		expect(row.description).toBe('An ambiguous utopia.');
		// No work ID: it did not come from a search provider.
		expect(row.workId).toBeNull();

		// The Add page sets the starting status separately (setInitialStatus).
		expect([row.wantSince, row.readingSince, row.finishedSince, row.rating]).toEqual([null, null, null, null]);

		// The uploaded cover was stored in the data folder and recorded.
		expect(row.coverPath).toBeTruthy();
		const onDisk = path.join(tmpDir, row.coverPath!);
		expect(fs.existsSync(onDisk)).toBe(true);
		expect(new Uint8Array(fs.readFileSync(onDisk))).toEqual(coverBytes);
	});

	it('opens the existing Book on a case-insensitive title + author match instead of duplicating', async () => {
		const db = testDb();

		const first = await addBookManually(
			{ db, coversDir },
			{ title: 'Dune', authors: ['Frank Herbert'] }
		);
		const second = await addBookManually(
			{ db, coversDir },
			{ title: '  dune ', authors: ['frank  herbert'] }
		);

		expect(second.created).toBe(false);
		expect(second.bookId).toBe(first.bookId);
		expect(db.select().from(books).all()).toHaveLength(1);
	});

	it('treats a different author as a different Book', async () => {
		const db = testDb();

		const first = await addBookManually(
			{ db, coversDir },
			{ title: 'Selected Poems', authors: ['Mary Oliver'] }
		);
		const second = await addBookManually(
			{ db, coversDir },
			{ title: 'Selected Poems', authors: ['Rainer Maria Rilke'] }
		);

		expect(second.created).toBe(true);
		expect(second.bookId).not.toBe(first.bookId);
		expect(db.select().from(books).all()).toHaveLength(2);
	});

	it('opens a search-added Book when the hand-entered title + authors match it', async () => {
		const db = testDb();
		const fromSearch = await addBook({ db, coversDir, fetchImpl: okCover }, { result: result() });

		const manual = addBookManually({ db, coversDir }, { title: 'DUNE', authors: ['Frank Herbert'] });

		expect(manual).toEqual({ bookId: fromSearch.bookId, created: false });
	});

	it('does not store an uploaded cover that is not an image', () => {
		const db = testDb();
		const { bookId } = addBookManually(
			{ db, coversDir },
			{ title: 'Untitled', authors: [], cover: new TextEncoder().encode('<script>') }
		);

		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.coverPath).toBeNull();
	});

	it('creates the Book without a cover when none is uploaded', async () => {
		const db = testDb();

		const { bookId } = await addBookManually(
			{ db, coversDir },
			{ title: 'Untitled', authors: [] }
		);

		const row = db.select().from(books).where(eq(books.id, bookId)).get()!;
		expect(row.coverPath).toBeNull();
		expect(JSON.parse(row.authors)).toEqual([]);
	});
});
