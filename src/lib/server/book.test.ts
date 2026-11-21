import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books, notes, quotes, reads } from './db/schema';
import {
	applyReadMutation,
	deleteBook,
	loadBookDetail,
	setBookCoverFromBytes,
	setBookCoverFromUrl,
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
	it('returns the Book, its Reads, and annotation counts', () => {
		const db = testDb();
		const id = seedBook(db, { description: 'Spice.', isbn: '123', pageCount: 412, workId: '/works/OL45883W' });
		db.insert(reads).values({ bookId: id, startDate: '2026-01-01', outcome: 'open' }).run();
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
		expect(detail.reads).toHaveLength(1);
		expect(detail.reads[0]).toMatchObject({ outcome: 'open', startDate: '2026-01-01' });
		expect(detail.quoteCount).toBe(2);
		expect(detail.noteCount).toBe(1);
	});

	it('returns null for a missing Book', () => {
		const db = testDb();
		expect(loadBookDetail(db, 999)).toBeNull();
	});
});

describe('applyReadMutation', () => {
	it('inserts a Read', () => {
		const db = testDb();
		const id = seedBook(db);
		applyReadMutation(db, id, {
			kind: 'insert',
			read: { startDate: '2026-01-01', endDate: null, outcome: 'open', rating: null, readBefore: false }
		});
		const row = db.select().from(reads).where(eq(reads.bookId, id)).get()!;
		expect(row).toMatchObject({ outcome: 'open', startDate: '2026-01-01', readBefore: false });
	});

	it('updates a Read', () => {
		const db = testDb();
		const id = seedBook(db);
		const readId = db
			.insert(reads)
			.values({ bookId: id, startDate: '2026-01-01', outcome: 'open' })
			.returning({ id: reads.id })
			.get().id;
		applyReadMutation(db, id, {
			kind: 'update',
			id: readId,
			patch: { outcome: 'finished', endDate: '2026-02-01', rating: 5 }
		});
		const row = db.select().from(reads).where(eq(reads.id, readId)).get()!;
		expect(row).toMatchObject({ outcome: 'finished', endDate: '2026-02-01', rating: 5 });
	});

	it('deletes a Read and unlinks its Quotes and Notes, keeping them on the Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const readId = db
			.insert(reads)
			.values({ bookId: id, startDate: '2026-01-01', outcome: 'finished', endDate: '2026-02-01' })
			.returning({ id: reads.id })
			.get().id;
		db.insert(quotes).values({ bookId: id, readId, text: 'q' }).run();
		db.insert(notes).values({ bookId: id, readId, body: 'n' }).run();

		applyReadMutation(db, id, { kind: 'delete', id: readId, unlinkReadId: readId });

		expect(db.select().from(reads).where(eq(reads.id, readId)).get()).toBeUndefined();
		const quote = db.select().from(quotes).where(eq(quotes.bookId, id)).get()!;
		expect(quote.readId).toBeNull();
		const note = db.select().from(notes).where(eq(notes.bookId, id)).get()!;
		expect(note.readId).toBeNull();
	});

	it('does not touch a Read that belongs to another Book', () => {
		const db = testDb();
		const a = seedBook(db);
		const b = seedBook(db, { title: 'Other', workId: null });
		const readId = db
			.insert(reads)
			.values({ bookId: b, startDate: '2026-01-01', outcome: 'open' })
			.returning({ id: reads.id })
			.get().id;
		applyReadMutation(db, a, { kind: 'delete', id: readId, unlinkReadId: readId });
		expect(db.select().from(reads).where(eq(reads.id, readId)).get()).toBeDefined();
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
			pageCount: 256,
			whyRecommended: 'A friend'
		});
		const row = db.select().from(books).where(eq(books.id, id)).get()!;
		expect(row.title).toBe('Dune Messiah');
		expect(JSON.parse(row.authors)).toEqual(['Frank Herbert', 'Brian Herbert']);
		expect(row.description).toBe('A sequel.');
		expect(row.isbn).toBe('999');
		expect(row.pageCount).toBe(256);
		expect(row.whyRecommended).toBe('A friend');
	});
});

describe('deleteBook', () => {
	it('deletes the Book, its Reads/Quotes/Notes, and its cover file', () => {
		const db = testDb();
		const id = seedBook(db);
		const coverPath = setBookCoverFromBytes(db, coversDir, id, PNG)!;
		db.insert(reads).values({ bookId: id, outcome: 'finished', endDate: '2026-01-01' }).run();
		db.insert(quotes).values({ bookId: id, text: 'q' }).run();
		db.insert(notes).values({ bookId: id, body: 'n' }).run();
		const onDisk = path.join(coversDir, path.basename(coverPath));
		expect(fs.existsSync(onDisk)).toBe(true);

		deleteBook(db, coversDir, id);

		expect(db.select().from(books).where(eq(books.id, id)).get()).toBeUndefined();
		expect(db.select().from(reads).where(eq(reads.bookId, id)).all()).toEqual([]);
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
			whyRecommended: 'A friend',
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
		// The reader's own fields and the chosen cover are kept.
		expect(row.whyRecommended).toBe('A friend');
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
