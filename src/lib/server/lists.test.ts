import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './db/schema';
import { books, reads } from './db/schema';
import { getLists } from './lists';

function testDb(): BetterSQLite3Database<typeof schema> {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

describe('getLists', () => {
	it('reads Books and Reads from the store and categorises them', () => {
		const db = testDb();

		const want = db
			.insert(books)
			.values({ title: 'Want One', authors: JSON.stringify(['A']), whyRecommended: 'A friend' })
			.returning({ id: books.id })
			.get();
		const reading = db
			.insert(books)
			.values({ title: 'Reading One', authors: JSON.stringify(['B']), coverPath: 'covers/2.jpg' })
			.returning({ id: books.id })
			.get();
		const done = db
			.insert(books)
			.values({ title: 'Finished One', authors: JSON.stringify(['C']) })
			.returning({ id: books.id })
			.get();

		db.insert(reads)
			.values({ bookId: reading.id, startDate: '2026-11-01', outcome: 'open' })
			.run();
		db.insert(reads)
			.values({ bookId: done.id, endDate: '2026-10-01', outcome: 'finished', rating: 5 })
			.run();

		const lists = getLists(db);

		expect(lists.wantToRead.map((i) => i.bookId)).toEqual([want.id]);
		expect(lists.wantToRead[0]).toMatchObject({
			title: 'Want One',
			authors: ['A'],
			whyRecommended: 'A friend'
		});

		expect(lists.reading.map((i) => i.bookId)).toEqual([reading.id]);
		expect(lists.reading[0].coverPath).toBe('covers/2.jpg');

		expect(lists.finished.map((i) => i.bookId)).toEqual([done.id]);
		expect(lists.finished[0]).toMatchObject({ finishDate: '2026-10-01', rating: 5, isReread: false });

		expect(lists.abandoned).toEqual([]);
	});
});
