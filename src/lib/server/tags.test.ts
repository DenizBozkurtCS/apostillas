import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { bookTags, books } from './db/schema';
import { addTag, allTags, removeTag, tagsForBook } from './tags';

type TestDb = BetterSQLite3Database<typeof schema>;

function testDb(): TestDb {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

function book(db: TestDb, title: string): number {
	return db.insert(books).values({ title }).returning({ id: books.id }).get().id;
}

describe('Tags', () => {
	it('adds Tags case-insensitively, without duplicates', () => {
		const db = testDb();
		const dune = book(db, 'Dune');
		expect(addTag(db, dune, '#SciFi')).toBe('scifi');
		expect(addTag(db, dune, 'scifi')).toBe('scifi');
		expect(addTag(db, dune, '#classic')).toBe('classic');
		expect(tagsForBook(db, dune)).toEqual(['classic', 'scifi']);
	});

	it('refuses a name that cannot be a Tag', () => {
		const db = testDb();
		const dune = book(db, 'Dune');
		expect(addTag(db, dune, 'sci fi')).toBeNull();
		expect(tagsForBook(db, dune)).toEqual([]);
	});

	it('shares a Tag across Books and drops it with its last Book', () => {
		const db = testDb();
		const dune = book(db, 'Dune');
		const emma = book(db, 'Emma');
		addTag(db, dune, 'favourite');
		addTag(db, emma, 'Favourite');
		addTag(db, emma, 'austen');
		expect(allTags(db)).toEqual(['austen', 'favourite']);

		removeTag(db, dune, '#FAVOURITE');
		expect(tagsForBook(db, dune)).toEqual([]);
		expect(allTags(db)).toEqual(['austen', 'favourite']);

		removeTag(db, emma, 'favourite');
		expect(allTags(db)).toEqual(['austen']);
	});

	it('removes a Book’s Tags when the Book is deleted', () => {
		const db = testDb();
		const dune = book(db, 'Dune');
		addTag(db, dune, 'scifi');
		db.delete(books).where(eq(books.id, dune)).run();
		expect(db.select().from(bookTags).all()).toEqual([]);
		expect(allTags(db)).toEqual([]);
	});
});
