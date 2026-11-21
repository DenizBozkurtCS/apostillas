import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books } from './db/schema';
import { addNote, addQuote, deleteQuote, editNote, editQuote } from './annotations';
import { searchAnnotations, toMatchQuery } from './search';

function testDb(): BetterSQLite3Database<typeof schema> {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

function seedBook(
	db: BetterSQLite3Database<typeof schema>,
	over: Partial<typeof books.$inferInsert> = {}
) {
	return db
		.insert(books)
		.values({ title: 'Dune', authors: JSON.stringify(['Frank Herbert']), ...over })
		.returning({ id: books.id })
		.get().id;
}

describe('toMatchQuery', () => {
	it('builds a prefix AND query, escaping quotes', () => {
		expect(toMatchQuery('fear mind')).toBe('"fear"* "mind"*');
		expect(toMatchQuery('say "hi"')).toBe('"say"* """hi"""*');
	});

	it('returns null for a blank or punctuation-only query', () => {
		expect(toMatchQuery('   ')).toBeNull();
		expect(toMatchQuery('!!! ???')).toBeNull();
		expect(toMatchQuery('')).toBeNull();
	});
});

describe('searchAnnotations', () => {
	it('finds a Quote and reports its kind, Book and a marked snippet', () => {
		const db = testDb();
		const id = seedBook(db);
		addQuote(db, id, { text: 'Fear is the mind-killer.', location: 'p. 8' });

		const hits = searchAnnotations(db, 'fear');
		expect(hits).toHaveLength(1);
		expect(hits[0]).toMatchObject({ kind: 'quote', bookId: id, bookTitle: 'Dune' });
		expect(hits[0].bookAuthors).toEqual(['Frank Herbert']);
		expect(hits[0].snippetHtml).toContain('<mark>Fear</mark>');
	});

	it('finds a Note by its Markdown body', () => {
		const db = testDb();
		const id = seedBook(db);
		addNote(db, id, { body: 'A thought about **ecology** and power.' });

		const hits = searchAnnotations(db, 'ecology');
		expect(hits).toHaveLength(1);
		expect(hits[0].kind).toBe('note');
		expect(hits[0].snippetHtml).toContain('<mark>ecology</mark>');
	});

	it('matches by prefix', () => {
		const db = testDb();
		const id = seedBook(db);
		addQuote(db, id, { text: 'The spice must flow', location: null });
		expect(searchAnnotations(db, 'spi')).toHaveLength(1);
	});

	it('returns nothing for a blank query', () => {
		const db = testDb();
		const id = seedBook(db);
		addQuote(db, id, { text: 'anything', location: null });
		expect(searchAnnotations(db, '   ')).toEqual([]);
	});

	it('stays in sync when a Quote is edited', () => {
		const db = testDb();
		const id = seedBook(db);
		const q = addQuote(db, id, { text: 'arrakis', location: null })!;
		editQuote(db, id, q, { text: 'caladan', location: null });
		expect(searchAnnotations(db, 'arrakis')).toEqual([]);
		expect(searchAnnotations(db, 'caladan')).toHaveLength(1);
	});

	it('stays in sync when a Note is edited', () => {
		const db = testDb();
		const id = seedBook(db);
		const n = addNote(db, id, { body: 'sihaya' })!;
		editNote(db, id, n, { body: 'muaddib' });
		expect(searchAnnotations(db, 'sihaya')).toEqual([]);
		expect(searchAnnotations(db, 'muaddib')).toHaveLength(1);
	});

	it('stays in sync when a Quote is deleted', () => {
		const db = testDb();
		const id = seedBook(db);
		const q = addQuote(db, id, { text: 'gom jabbar', location: null })!;
		deleteQuote(db, id, q);
		expect(searchAnnotations(db, 'jabbar')).toEqual([]);
	});

	it('drops a Book\'s annotations from the index when the Book is deleted', () => {
		const db = testDb();
		const id = seedBook(db);
		addQuote(db, id, { text: 'kwisatz haderach', location: null });
		addNote(db, id, { body: 'bene gesserit' });
		db.delete(books).where(eq(books.id, id)).run();
		expect(searchAnnotations(db, 'kwisatz')).toEqual([]);
		expect(searchAnnotations(db, 'gesserit')).toEqual([]);
	});

	it('HTML-escapes the snippet so stored markup cannot inject', () => {
		const db = testDb();
		const id = seedBook(db);
		addQuote(db, id, { text: 'danger <script>alert(1)</script> here', location: null });
		const hits = searchAnnotations(db, 'danger');
		expect(hits[0].snippetHtml).not.toContain('<script>');
		expect(hits[0].snippetHtml).toContain('&lt;script&gt;');
		expect(hits[0].snippetHtml).toContain('<mark>danger</mark>');
	});
});
