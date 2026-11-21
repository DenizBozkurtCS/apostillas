import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books, impressions, notes, quotes } from './db/schema';
import {
	deleteBook,
	loadBookDetail,
	rateBook,
	setBookCoverFromBytes,
	parseAddChoice,
	setBookCoverFromUrl,
	setInitialStatus,
	setStatus,
	syncBookMetadata,
	updateBookMetadata
} from './book';

function testDb(): BetterSQLite3Database<typeof schema> {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

let tmpDir: string;
let coversDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apostillas-book-'));
	coversDir = path.join(tmpDir, 'covers');
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedBook(db: BetterSQLite3Database<typeof schema>, over: Partial<typeof books.$inferInsert> = {}) {
	return db
		.insert(books)
		.values({ title: 'Dune', authors: JSON.stringify(['Frank Herbert']), ...over })
		.returning({ id: books.id })
		.get().id;
}

describe('loadBookDetail', () => {
	it('returns the Book, its statuses and Rating, and annotation counts', () => {
		const db = testDb();
		const id = seedBook(db, { description: 'Spice.', isbn: '123', pageCount: 412, workId: '/works/OL45883W' });
		db.update(books).set({ readingSince: T1, rating: 4.5 }).run();
		db.insert(quotes).values({ bookId: id, text: 'a' }).run();
		db.insert(quotes).values({ bookId: id, text: 'b' }).run();
		db.insert(notes).values({ bookId: id, body: 'n' }).run();

		const detail = loadBookDetail(db, id)!;
		expect(detail.book).toMatchObject({
			id,
			title: 'Dune',
			authors: ['Frank Herbert'],
			description: 'Spice.',
			isbn: '123',
			pageCount: 412,
			workId: '/works/OL45883W'
		});
		expect(detail.book.statuses).toEqual({ want: null, reading: T1, finished: null });
		expect(detail.book.rating).toBe(4.5);
		expect(detail.quoteCount).toBe(2);
		expect(detail.noteCount).toBe(1);
	});

	it('returns null for a missing Book', () => {
		const db = testDb();
		expect(loadBookDetail(db, 999)).toBeNull();
	});
});

const T1 = '2026-11-01T10:00:00.000Z';
const T2 = '2026-11-02T10:00:00.000Z';

const statusesOf = (db: BetterSQLite3Database<typeof schema>, id: number) =>
	loadBookDetail(db, id)!.book.statuses;

describe('setStatus', () => {
	it('switches each status on and off independently', () => {
		const db = testDb();
		const id = seedBook(db);
		setStatus(db, id, 'want', true, T1);
		setStatus(db, id, 'reading', true, T1);
		setStatus(db, id, 'finished', true, T1);
		expect(statusesOf(db, id)).toEqual({ want: T1, reading: T1, finished: T1 });

		setStatus(db, id, 'reading', false, T2);
		expect(statusesOf(db, id)).toEqual({ want: T1, reading: null, finished: T1 });
	});

	it('keeps the original moment when switching on a status that is already on', () => {
		const db = testDb();
		const id = seedBook(db);
		setStatus(db, id, 'finished', true, T1);
		setStatus(db, id, 'finished', true, T2);
		expect(statusesOf(db, id).finished).toBe(T1);
	});

	it('only touches the given Book', () => {
		const db = testDb();
		const a = seedBook(db);
		const b = seedBook(db, { title: 'Emma' });
		setStatus(db, a, 'want', true, T1);
		expect(statusesOf(db, b).want).toBeNull();
	});
});

describe('rateBook', () => {
	it('sets the Rating and switches Read it on, leaving the other statuses alone', () => {
		const db = testDb();
		const id = seedBook(db);
		setStatus(db, id, 'reading', true, T1);
		expect(rateBook(db, id, 3.5, T2)).toBe(true);
		const { book } = loadBookDetail(db, id)!;
		expect(book.rating).toBe(3.5);
		expect(book.statuses).toEqual({ want: null, reading: T1, finished: T2 });
	});

	it('clears the Rating without touching the statuses', () => {
		const db = testDb();
		const id = seedBook(db);
		rateBook(db, id, 4, T1);
		rateBook(db, id, null, T2);
		const { book } = loadBookDetail(db, id)!;
		expect(book.rating).toBeNull();
		expect(book.statuses.finished).toBe(T1);
	});

	it('refuses an invalid rating', () => {
		const db = testDb();
		const id = seedBook(db);
		expect(rateBook(db, id, 4.3)).toBe(false);
		expect(rateBook(db, id, 0)).toBe(false);
		expect(loadBookDetail(db, id)!.book).toMatchObject({ rating: null, statuses: { finished: null } });
	});
});

describe('updateBookMetadata', () => {
	it('rewrites the editable metadata fields', () => {
		const db = testDb();
		const id = seedBook(db);
		updateBookMetadata(db, id, {
			title: 'Dune Messiah',
			authors: ['Frank Herbert', 'Brian Herbert'],
			description: 'A sequel.',
			isbn: '999',
			pageCount: 256
		});
		const row = db.select().from(books).where(eq(books.id, id)).get()!;
		expect(row.title).toBe('Dune Messiah');
		expect(JSON.parse(row.authors)).toEqual(['Frank Herbert', 'Brian Herbert']);
		expect(row.description).toBe('A sequel.');
		expect(row.isbn).toBe('999');
		expect(row.pageCount).toBe(256);
	});
});

describe('deleteBook', () => {
	it('deletes the Book, its Impressions/Quotes/Notes, and its cover file', () => {
		const db = testDb();
		const id = seedBook(db);
		const coverPath = setBookCoverFromBytes(db, coversDir, id, PNG)!;
		db.insert(impressions).values({ bookId: id, date: '2026-01-01' }).run();
		db.insert(quotes).values({ bookId: id, text: 'q' }).run();
		db.insert(notes).values({ bookId: id, body: 'n' }).run();
		const onDisk = path.join(coversDir, path.basename(coverPath));
		expect(fs.existsSync(onDisk)).toBe(true);

		deleteBook(db, coversDir, id);

		expect(db.select().from(books).where(eq(books.id, id)).get()).toBeUndefined();
		expect(db.select().from(impressions).where(eq(impressions.bookId, id)).all()).toEqual([]);
		expect(db.select().from(quotes).where(eq(quotes.bookId, id)).all()).toEqual([]);
		expect(db.select().from(notes).where(eq(notes.bookId, id)).all()).toEqual([]);
		expect(fs.existsSync(onDisk)).toBe(false);
	});
});

describe('setBookCoverFromBytes', () => {
	it('stores an uploaded cover and records its path', () => {
		const db = testDb();
		const id = seedBook(db);
		const coverPath = setBookCoverFromBytes(db, coversDir, id, PNG);
		expect(coverPath).toBe(`covers/${id}.png`);
		expect(db.select().from(books).where(eq(books.id, id)).get()!.coverPath).toBe(coverPath);
		expect(fs.existsSync(path.join(coversDir, `${id}.png`))).toBe(true);
	});

	it('rejects bytes that are not an accepted image', () => {
		const db = testDb();
		const id = seedBook(db);
		expect(setBookCoverFromBytes(db, coversDir, id, new TextEncoder().encode('<svg>'))).toBeNull();
		expect(db.select().from(books).where(eq(books.id, id)).get()!.coverPath).toBeNull();
	});

	it('removes the previous cover file when the extension changes', () => {
		const db = testDb();
		const id = seedBook(db);
		setBookCoverFromBytes(db, coversDir, id, PNG);
		expect(fs.existsSync(path.join(coversDir, `${id}.png`))).toBe(true);

		const newPath = setBookCoverFromBytes(db, coversDir, id, JPEG);
		expect(newPath).toBe(`covers/${id}.jpg`);
		expect(fs.existsSync(path.join(coversDir, `${id}.jpg`))).toBe(true);
		// The stale PNG is gone, so a backup folder copy has no orphan.
		expect(fs.existsSync(path.join(coversDir, `${id}.png`))).toBe(false);
	});
});

describe('setBookCoverFromUrl', () => {
	it('downloads an edition cover from the provider host and records it', async () => {
		const db = testDb();
		const id = seedBook(db);
		const fetchImpl = vi.fn(async () => new Response(PNG, { status: 200 }));
		const coverPath = await setBookCoverFromUrl(
			db,
			coversDir,
			id,
			'https://covers.openlibrary.org/b/id/111-L.jpg',
			fetchImpl
		);
		expect(coverPath).toBe(`covers/${id}.png`);
		expect(db.select().from(books).where(eq(books.id, id)).get()!.coverPath).toBe(coverPath);
	});

	it('refuses a URL that is not on a provider cover host', async () => {
		const db = testDb();
		const id = seedBook(db);
		const fetchImpl = vi.fn(async () => new Response(PNG));
		const coverPath = await setBookCoverFromUrl(
			db,
			coversDir,
			id,
			'http://169.254.169.254/latest',
			fetchImpl
		);
		expect(coverPath).toBeNull();
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(db.select().from(books).where(eq(books.id, id)).get()!.coverPath).toBeNull();
	});
});

describe('syncBookMetadata', () => {
	const work = {
		source: 'open-library' as const,
		workId: '/works/OL45883W',
		title: 'Dune',
		authors: ['Frank Herbert'],
		firstPublishYear: 1965,
		coverUrl: 'https://covers.openlibrary.org/b/id/42-L.jpg',
		isbn: '9780441013593',
		pageCount: 412,
		description: 'A desert planet.'
	};

	it('restores title, authors, description and Edition fields from Open Library', async () => {
		const db = testDb();
		const id = seedBook(db, {
			title: 'Dune (my edit)',
			authors: JSON.stringify(['Someone']),
			description: 'Mine.',
			workId: '/works/OL45883W',
			isbn: '111',
			pageCount: 1,
			coverPath: 'covers/1.jpg'
		});

		const result = await syncBookMetadata(db, id, async () => work);

		expect(result).toBe('synced');
		const row = db.select().from(books).where(eq(books.id, id)).get()!;
		expect(row.title).toBe('Dune');
		expect(JSON.parse(row.authors)).toEqual(['Frank Herbert']);
		expect(row.description).toBe('A desert planet.');
		expect(row.isbn).toBe('9780441013593');
		expect(row.pageCount).toBe(412);
		// The chosen cover is kept.
		expect(row.coverPath).toBe('covers/1.jpg');
	});

	it('keeps current values where Open Library has none', async () => {
		const db = testDb();
		const id = seedBook(db, { workId: '/works/OL45883W', description: 'Mine.', isbn: '111', pageCount: 5 });

		await syncBookMetadata(db, id, async () => ({ ...work, description: '', isbn: null, pageCount: null }));

		const row = db.select().from(books).where(eq(books.id, id)).get()!;
		expect(row.description).toBe('Mine.');
		expect(row.isbn).toBe('111');
		expect(row.pageCount).toBe(5);
	});

	it('reports no-source for a Book without an Open Library work ID', async () => {
		const db = testDb();
		const id = seedBook(db);
		const lookup = vi.fn();
		expect(await syncBookMetadata(db, id, lookup)).toBe('no-source');
		expect(lookup).not.toHaveBeenCalled();
	});

	it('reports unavailable and changes nothing when the lookup fails', async () => {
		const db = testDb();
		const id = seedBook(db, { workId: '/works/OL45883W', title: 'Mine' });
		expect(await syncBookMetadata(db, id, async () => null)).toBe('unavailable');
		expect(db.select().from(books).where(eq(books.id, id)).get()!.title).toBe('Mine');
	});
});

describe('setInitialStatus', () => {
	it('switches on the chosen status only, recording no Impression', () => {
		const db = testDb();
		for (const addAs of ['want', 'reading', 'finished'] as const) {
			const id = seedBook(db, { title: addAs });
			setInitialStatus(db, id, { addAs, rating: null }, T1);
			const statuses = statusesOf(db, id);
			expect(Object.entries(statuses).filter(([, v]) => v !== null)).toEqual([[addAs, T1]]);
		}
		expect(db.select().from(impressions).all()).toEqual([]);
	});

	it('records a half-star rating unchanged on a Book added as Read it', () => {
		const db = testDb();
		const id = seedBook(db);
		setInitialStatus(db, id, { addAs: 'finished', rating: 3.5 }, T1);
		expect(loadBookDetail(db, id)!.book).toMatchObject({ rating: 3.5, statuses: { finished: T1 } });
	});
});

describe('parseAddChoice', () => {
	const form = (fields: Record<string, string>) => {
		const f = new FormData();
		for (const [k, v] of Object.entries(fields)) f.set(k, v);
		return f;
	};

	it('reads the chosen status, defaulting anything else to Want to read', () => {
		expect(parseAddChoice(form({ addAs: 'reading' }))).toEqual({ addAs: 'reading', rating: null });
		expect(parseAddChoice(form({ addAs: 'finished' }))).toEqual({ addAs: 'finished', rating: null });
		expect(parseAddChoice(form({ addAs: 'want' }))).toEqual({ addAs: 'want', rating: null });
		expect(parseAddChoice(form({}))).toEqual({ addAs: 'want', rating: null });
		expect(parseAddChoice(form({ addAs: 'abandoned' }))).toEqual({ addAs: 'want', rating: null });
	});

	it('treats a star rating as adding to Finished with that rating', () => {
		expect(parseAddChoice(form({ rating: '4' }))).toEqual({ addAs: 'finished', rating: 4 });
		expect(parseAddChoice(form({ rating: '1' }))).toEqual({ addAs: 'finished', rating: 1 });
		expect(parseAddChoice(form({ rating: '0.5' }))).toEqual({ addAs: 'finished', rating: 0.5 });
		expect(parseAddChoice(form({ rating: '3.5' }))).toEqual({ addAs: 'finished', rating: 3.5 });
	});

	it('ignores a rating outside ½ to 5 or not in half steps', () => {
		expect(parseAddChoice(form({ rating: '6' }))).toEqual({ addAs: 'want', rating: null });
		expect(parseAddChoice(form({ rating: '0' }))).toEqual({ addAs: 'want', rating: null });
		expect(parseAddChoice(form({ rating: '2.3' }))).toEqual({ addAs: 'want', rating: null });
		expect(parseAddChoice(form({ rating: 'x' }))).toEqual({ addAs: 'want', rating: null });
	});
});
