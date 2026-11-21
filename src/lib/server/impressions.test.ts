import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books } from './db/schema';
import {
	addImpression,
	deleteImpression,
	editImpression,
	impressionFromForm,
	loadAllImpressions,
	loadImpressions
} from './impressions';

type TestDb = BetterSQLite3Database<typeof schema>;

function testDb(): TestDb {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

function book(db: TestDb, title = 'Dune'): number {
	return db.insert(books).values({ title, authors: '["A"]' }).returning({ id: books.id }).get().id;
}

const bookRow = (db: TestDb, id: number) => db.select().from(books).where(eq(books.id, id)).get()!;
const input = { date: '2026-11-01', rating: null, review: null, reread: false, didNotFinish: false };

describe('Impressions', () => {
	it('adds, lists newest first, edits and deletes', () => {
		const db = testDb();
		const id = book(db);
		const a = addImpression(db, id, { ...input, date: '2025-05-01', review: 'First time' });
		const b = addImpression(db, id, { ...input, date: '2026-01-01', reread: true });
		expect(loadImpressions(db, id).map((i) => i.id)).toEqual([b, a]);

		expect(editImpression(db, id, a, { ...input, date: '2026-06-01', didNotFinish: true })).toBe(true);
		expect(loadImpressions(db, id)[0]).toMatchObject({ id: a, date: '2026-06-01', review: null, didNotFinish: true });

		deleteImpression(db, id, b);
		expect(loadImpressions(db, id).map((i) => i.id)).toEqual([a]);
	});

	it('makes a saved rating the Book’s Rating', () => {
		const db = testDb();
		const id = book(db);
		db.update(books).set({ rating: 2 }).run();
		const a = addImpression(db, id, { ...input, rating: 4.5 });
		expect(bookRow(db, id).rating).toBe(4.5);

		// An unrated Impression leaves the Rating alone; editing in a rating sets it.
		addImpression(db, id, input);
		expect(bookRow(db, id).rating).toBe(4.5);
		editImpression(db, id, a, { ...input, rating: 3 });
		expect(bookRow(db, id).rating).toBe(3);

		// Deleting keeps the Rating.
		deleteImpression(db, id, a);
		expect(bookRow(db, id).rating).toBe(3);
	});

	it('leaving an Impression ends Reading and switches Read it on, keeping Want to read', () => {
		const db = testDb();
		const id = book(db);
		const T = '2026-11-01T10:00:00.000Z';
		const NOW = '2026-11-21T10:00:00.000Z';
		db.update(books).set({ wantSince: T, readingSince: T }).run();
		addImpression(db, id, input, NOW);
		expect(bookRow(db, id)).toMatchObject({ wantSince: T, readingSince: null, finishedSince: NOW });

		// Already Read it: keeps its original moment.
		addImpression(db, id, input, '2027-01-01T00:00:00.000Z');
		expect(bookRow(db, id).finishedSince).toBe(NOW);
	});

	it('a Didn’t finish Impression ends Reading but does not switch Read it on', () => {
		const db = testDb();
		const id = book(db);
		db.update(books).set({ readingSince: '2026-11-01T10:00:00.000Z' }).run();
		addImpression(db, id, { ...input, didNotFinish: true });
		expect(bookRow(db, id)).toMatchObject({ readingSince: null, finishedSince: null });
	});

	it('editing an Impression changes no status', () => {
		const db = testDb();
		const id = book(db);
		const a = addImpression(db, id, { ...input, didNotFinish: true });
		const T = '2026-11-01T10:00:00.000Z';
		db.update(books).set({ readingSince: T }).run();
		editImpression(db, id, a, { ...input, rating: 4 });
		expect(bookRow(db, id)).toMatchObject({ readingSince: T, finishedSince: null });
	});

	it('only touches Impressions of the given Book', () => {
		const db = testDb();
		const dune = book(db);
		const emma = book(db, 'Emma');
		const a = addImpression(db, dune, input);
		expect(editImpression(db, emma, a, { ...input, rating: 5 })).toBe(false);
		deleteImpression(db, emma, a);
		expect(loadImpressions(db, dune)).toHaveLength(1);
		expect(bookRow(db, emma).rating).toBeNull();
	});
});

describe('loadAllImpressions', () => {
	it('lists every Impression with its Book, newest first', () => {
		const db = testDb();
		const dune = book(db);
		const emma = book(db, 'Emma');
		addImpression(db, dune, { ...input, date: '2025-01-01' });
		addImpression(db, emma, { ...input, date: '2026-03-01', review: 'Witty' });
		expect(loadAllImpressions(db).map((i) => [i.date, i.book.title, i.book.authors])).toEqual([
			['2026-03-01', 'Emma', ['A']],
			['2025-01-01', 'Dune', ['A']]
		]);
	});
});

describe('impressionFromForm', () => {
	const form = (fields: Record<string, string>) => {
		const f = new FormData();
		for (const [k, v] of Object.entries(fields)) f.set(k, v);
		return f;
	};

	it('reads the fields and tick boxes', () => {
		expect(
			impressionFromForm(form({ date: '2026-11-21', rating: '4.5', review: ' Great ', reread: 'on' }))
		).toEqual({
			ok: true,
			input: { date: '2026-11-21', rating: 4.5, review: 'Great', reread: true, didNotFinish: false }
		});
	});

	it('treats an empty rating as unrated and refuses a missing date', () => {
		expect(impressionFromForm(form({ date: '2026-11-21', rating: '' }))).toMatchObject({ input: { rating: null } });
		expect(impressionFromForm(form({ rating: '4' }))).toMatchObject({ ok: false });
	});
});
