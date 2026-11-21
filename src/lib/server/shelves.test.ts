import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books, reads, shelfBooks } from './db/schema';
import {
	addBookToShelf,
	createShelf,
	deleteShelf,
	loadBookcase,
	loadShelf,
	moveShelf,
	removeBookFromShelf,
	renameShelf,
	setShelfDescription
} from './shelves';

type TestDb = BetterSQLite3Database<typeof schema>;

function testDb(): TestDb {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

function book(db: TestDb, title: string): number {
	return db.insert(books).values({ title, authors: '["An Author"]' }).returning({ id: books.id }).get().id;
}

const names = (db: TestDb) => loadBookcase(db).map((s) => s.name);
const idOf = (db: TestDb, slug: string) => loadShelf(db, slug)!.id;

describe('Shelves', () => {
	it('creates Shelves at the top of the Bookcase', () => {
		const db = testDb();
		expect(createShelf(db, 'Summer 2027!', '  Beach reads  ')).toEqual({ ok: true, slug: 'summer-2027' });
		createShelf(db, 'Gifts for Dad');
		expect(names(db)).toEqual(['Gifts for Dad', 'Summer 2027!']);
		expect(loadShelf(db, 'summer-2027')).toMatchObject({ description: 'Beach reads', books: [] });
	});

	it('refuses a name whose address is taken or empty', () => {
		const db = testDb();
		createShelf(db, 'Gifts!');
		expect(createShelf(db, 'gifts?')).toEqual({ ok: false, error: 'You already have a Shelf called Gifts!.' });
		expect(createShelf(db, '★★★')).toMatchObject({ ok: false });
		expect(names(db)).toEqual(['Gifts!']);
	});

	it('renames a Shelf and moves its address', () => {
		const db = testDb();
		createShelf(db, 'Summer 2027');
		createShelf(db, 'Gifts');
		const id = idOf(db, 'summer-2027');
		expect(renameShelf(db, id, 'Summer reads')).toEqual({ ok: true, slug: 'summer-reads' });
		expect(loadShelf(db, 'summer-2027')).toBeNull();
		expect(loadShelf(db, 'summer-reads')?.name).toBe('Summer reads');
		expect(renameShelf(db, id, 'GIFTS')).toMatchObject({ ok: false });
		// Changing only the case keeps its own address.
		expect(renameShelf(db, id, 'SUMMER READS')).toEqual({ ok: true, slug: 'summer-reads' });
	});

	it('sets and clears the description', () => {
		const db = testDb();
		createShelf(db, 'A');
		const id = idOf(db, 'a');
		setShelfDescription(db, id, 'Hello');
		expect(loadShelf(db, 'a')?.description).toBe('Hello');
		setShelfDescription(db, id, '  ');
		expect(loadShelf(db, 'a')?.description).toBeNull();
	});

	it('moves Shelves up and down, stopping at the ends', () => {
		const db = testDb();
		createShelf(db, 'C');
		createShelf(db, 'B');
		createShelf(db, 'A');
		moveShelf(db, idOf(db, 'a'), 'down');
		expect(names(db)).toEqual(['B', 'A', 'C']);
		moveShelf(db, idOf(db, 'c'), 'up');
		expect(names(db)).toEqual(['B', 'C', 'A']);
		moveShelf(db, idOf(db, 'b'), 'up');
		moveShelf(db, idOf(db, 'a'), 'down');
		expect(names(db)).toEqual(['B', 'C', 'A']);
	});

	it('keeps Books in the order they were added, once each, with ratings for Finished Books', () => {
		const db = testDb();
		createShelf(db, 'S');
		const s = idOf(db, 's');
		const dune = book(db, 'Dune');
		const emma = book(db, 'Emma');
		db.insert(reads).values({ bookId: dune, outcome: 'finished', endDate: '2026-01-01', rating: 4.5 }).run();
		db.insert(reads).values({ bookId: emma, outcome: 'open', startDate: '2026-01-01' }).run();
		addBookToShelf(db, s, emma);
		addBookToShelf(db, s, dune);
		addBookToShelf(db, s, emma);
		expect(loadShelf(db, 's')!.books).toMatchObject([
			{ title: 'Emma', rating: null },
			{ title: 'Dune', rating: 4.5 }
		]);
		removeBookFromShelf(db, s, emma);
		expect(loadShelf(db, 's')!.books.map((b) => b.title)).toEqual(['Dune']);
	});

	it('deleting a Shelf keeps its Books; deleting a Book takes it off every Shelf', () => {
		const db = testDb();
		createShelf(db, 'S');
		createShelf(db, 'T');
		const dune = book(db, 'Dune');
		const emma = book(db, 'Emma');
		addBookToShelf(db, idOf(db, 's'), dune);
		addBookToShelf(db, idOf(db, 't'), dune);
		addBookToShelf(db, idOf(db, 't'), emma);

		deleteShelf(db, idOf(db, 's'));
		expect(db.select().from(books).all()).toHaveLength(2);

		db.delete(books).where(eq(books.id, dune)).run();
		expect(db.select().from(shelfBooks).all()).toHaveLength(1);
		expect(loadShelf(db, 't')!.books.map((b) => b.title)).toEqual(['Emma']);
	});
});
