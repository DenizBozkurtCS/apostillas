import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './db/schema';
import { books, impressions } from './db/schema';
import { getLists } from './lists';

function testDb(): BetterSQLite3Database<typeof schema> {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

const T1 = '2026-11-01T10:00:00.000Z';
const T2 = '2026-11-02T10:00:00.000Z';

function book(db: ReturnType<typeof testDb>, values: Partial<typeof books.$inferInsert>): number {
	return db
		.insert(books)
		.values({ title: 'A Book', authors: JSON.stringify(['A']), ...values })
		.returning({ id: books.id })
		.get().id;
}

describe('getLists', () => {
	it('puts a Book on every list whose status it has, and on none without one', () => {
		const db = testDb();
		const want = book(db, { title: 'Want One', whyRecommended: 'A friend', wantSince: T1 });
		const both = book(db, { title: 'Reread', coverPath: 'covers/2.jpg', readingSince: T1, finishedSince: T1, rating: 5 });
		book(db, { title: 'No status' });

		const lists = getLists(db);

		expect(lists.wantToRead.map((i) => i.bookId)).toEqual([want]);
		expect(lists.wantToRead[0]).toMatchObject({ title: 'Want One', authors: ['A'], whyRecommended: 'A friend' });
		expect(lists.reading.map((i) => i.bookId)).toEqual([both]);
		expect(lists.reading[0].coverPath).toBe('covers/2.jpg');
		expect(lists.finished).toEqual([expect.objectContaining({ bookId: both, rating: 5, years: [] })]);
	});

	it('orders each list by when its status was switched on, newest first', () => {
		const db = testDb();
		const older = book(db, { title: 'Older', finishedSince: T1 });
		const newer = book(db, { title: 'Newer', finishedSince: T2 });
		expect(getLists(db).finished.map((i) => i.bookId)).toEqual([newer, older]);
	});

	it('gives Books the distinct years of their Impressions', () => {
		const db = testDb();
		const id = book(db, { finishedSince: T1 });
		for (const date of ['2025-03-01', '2025-09-01', '2026-01-05']) {
			db.insert(impressions).values({ bookId: id, date }).run();
		}
		expect(getLists(db).finished[0].years.sort()).toEqual([2025, 2026]);
	});
});
