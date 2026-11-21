import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './db/schema';
import { books, notes, quotes, reads } from './db/schema';
import { annotatableBooks, canAnnotateBook, loadFeed } from './notes';

type TestDb = BetterSQLite3Database<typeof schema>;

function testDb(): TestDb {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

function book(db: TestDb, title: string): number {
	return db
		.insert(books)
		.values({ title, authors: JSON.stringify(['An Author']) })
		.returning({ id: books.id })
		.get().id;
}

function read(db: TestDb, bookId: number, over: Partial<typeof reads.$inferInsert>): number {
	return db
		.insert(reads)
		.values({ bookId, outcome: 'finished', ...over })
		.returning({ id: reads.id })
		.get().id;
}

describe('loadFeed', () => {
	it('lists every Note and Quote newest first, each with its Book', () => {
		const db = testDb();
		const dune = book(db, 'Dune');
		const emma = book(db, 'Emma');
		db.insert(notes).values({ bookId: dune, body: 'old **note**', createdAt: '2026-01-01 10:00:00' }).run();
		db.insert(notes).values({ bookId: emma, body: 'new note', createdAt: '2026-02-01 10:00:00' }).run();
		db.insert(quotes).values({ bookId: dune, text: 'Fear is the mind-killer.', location: 'p. 8' }).run();

		const feed = loadFeed(db);

		expect(feed.notes.map((n) => [n.body, n.book.title])).toEqual([
			['new note', 'Emma'],
			['old **note**', 'Dune']
		]);
		expect(feed.notes[1].html).toContain('<strong>note</strong>');
		expect(feed.notes[0].book.authors).toEqual(['An Author']);
		expect(feed.quotes).toHaveLength(1);
		expect(feed.quotes[0]).toMatchObject({ text: 'Fear is the mind-killer.', location: 'p. 8' });
		expect(feed.quotes[0].book.id).toBe(dune);
	});
});

describe('annotatableBooks', () => {
	it('offers every Book except Want to read ones, by title', () => {
		const db = testDb();
		book(db, 'Zed (want to read)');
		const reading = book(db, 'Reading one');
		read(db, reading, { outcome: 'open', startDate: '2026-11-01' });
		const abandoned = book(db, 'Abandoned one');
		read(db, abandoned, { outcome: 'abandoned', endDate: '2026-10-01' });

		expect(annotatableBooks(db).map((b) => b.title)).toEqual(['Abandoned one', 'Reading one']);
		expect(canAnnotateBook(db, reading)).toBe(true);
	});

	it('defaults the linked Read to the open Read, else the newest Read', () => {
		const db = testDb();
		const reading = book(db, 'Reading');
		read(db, reading, { endDate: '2024-01-01' });
		const open = read(db, reading, { outcome: 'open', startDate: '2026-11-01' });
		const finished = book(db, 'Finished');
		read(db, finished, { endDate: '2024-01-01' });
		const newest = read(db, finished, { endDate: '2026-01-01' });

		const byTitle = Object.fromEntries(annotatableBooks(db).map((b) => [b.title, b]));
		expect(byTitle.Reading.defaultReadId).toBe(open);
		expect(byTitle.Finished.defaultReadId).toBe(newest);
		expect(byTitle.Finished.reads.map((r) => r.id)[0]).toBe(newest);
	});

	it('refuses a Want to read Book or one that does not exist', () => {
		const db = testDb();
		const want = book(db, 'Want');
		expect(canAnnotateBook(db, want)).toBe(false);
		expect(canAnnotateBook(db, 999)).toBe(false);
	});
});
