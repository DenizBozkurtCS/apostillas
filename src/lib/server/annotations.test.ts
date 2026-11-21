import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books, notes, quotes } from './db/schema';
import {
	addNote,
	addQuote,
	deleteNote,
	deleteQuote,
	editNote,
	editQuote,
	loadAnnotations
} from './annotations';

function testDb(): BetterSQLite3Database<typeof schema> {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return db;
}

function seedBook(db: BetterSQLite3Database<typeof schema>, over: Partial<typeof books.$inferInsert> = {}) {
	return db
		.insert(books)
		.values({ title: 'Dune', authors: JSON.stringify(['Frank Herbert']), ...over })
		.returning({ id: books.id })
		.get().id;
}

describe('addQuote', () => {
	it('adds a Quote with text and location', () => {
		const db = testDb();
		const id = seedBook(db);
		const quoteId = addQuote(db, id, { text: 'Fear is the mind-killer.', location: 'p. 8' });
		const row = db.select().from(quotes).where(eq(quotes.id, quoteId!)).get()!;
		expect(row).toMatchObject({ bookId: id, text: 'Fear is the mind-killer.', location: 'p. 8' });
	});

	it('refuses empty text', () => {
		const db = testDb();
		const id = seedBook(db);
		expect(addQuote(db, id, { text: '   ', location: null })).toBeNull();
		expect(db.select().from(quotes).all()).toEqual([]);
	});

});

describe('addNote', () => {
	it('adds a Note with a Markdown body', () => {
		const db = testDb();
		const id = seedBook(db);
		const noteId = addNote(db, id, { body: '# A thought' });
		expect(db.select().from(notes).where(eq(notes.id, noteId!)).get()).toMatchObject({
			bookId: id,
			body: '# A thought'
		});
	});

	it('refuses an empty body', () => {
		const db = testDb();
		const id = seedBook(db);
		expect(addNote(db, id, { body: '  \n ' })).toBeNull();
		expect(db.select().from(notes).all()).toEqual([]);
	});
});

describe('editQuote / editNote', () => {
	it('updates a Quote scoped to its Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const quoteId = addQuote(db, id, { text: 'old', location: null })!;
		expect(editQuote(db, id, quoteId, { text: 'new', location: 'p. 1' })).toBe(true);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()).toMatchObject({
			text: 'new',
			location: 'p. 1'
		});
	});

	it('does not edit a Quote that belongs to another Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const other = seedBook(db, { title: 'Other', workId: null });
		const quoteId = addQuote(db, other, { text: 'theirs', location: null })!;
		expect(editQuote(db, id, quoteId, { text: 'hacked', location: null })).toBe(false);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()!.text).toBe('theirs');
	});

	it('refuses blank edited text/body', () => {
		const db = testDb();
		const id = seedBook(db);
		const quoteId = addQuote(db, id, { text: 'keep', location: null })!;
		expect(editQuote(db, id, quoteId, { text: ' ', location: null })).toBe(false);
		const noteId = addNote(db, id, { body: 'keep' })!;
		expect(editNote(db, id, noteId, { body: ' ' })).toBe(false);
	});

	it('updates a Note body', () => {
		const db = testDb();
		const id = seedBook(db);
		const noteId = addNote(db, id, { body: 'old' })!;
		expect(editNote(db, id, noteId, { body: 'new body' })).toBe(true);
		expect(db.select().from(notes).where(eq(notes.id, noteId)).get()!.body).toBe('new body');
	});
});

describe('deleteQuote / deleteNote', () => {
	it('deletes a Quote scoped to its Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const quoteId = addQuote(db, id, { text: 'q', location: null })!;
		deleteQuote(db, id, quoteId);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()).toBeUndefined();
	});

	it('does not delete a Quote belonging to another Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const other = seedBook(db, { title: 'Other', workId: null });
		const quoteId = addQuote(db, other, { text: 'theirs', location: null })!;
		deleteQuote(db, id, quoteId);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()).toBeDefined();
	});

	it('deletes a Note scoped to its Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const noteId = addNote(db, id, { body: 'n' })!;
		deleteNote(db, id, noteId);
		expect(db.select().from(notes).where(eq(notes.id, noteId)).get()).toBeUndefined();
	});
});

describe('loadAnnotations', () => {
	it('returns Quotes and Notes newest first with rendered Note HTML', () => {
		const db = testDb();
		const id = seedBook(db);
		const q1 = addQuote(db, id, { text: 'first', location: null })!;
		const q2 = addQuote(db, id, { text: 'second', location: 'p. 2' })!;
		addNote(db, id, { body: '**bold**' })!;

		const { quotes: qs, notes: ns } = loadAnnotations(db, id);
		expect(qs.map((q) => q.id)).toEqual([q2, q1]); // newest first
		expect(qs[0]).toMatchObject({ text: 'second', location: 'p. 2' });
		expect(ns).toHaveLength(1);
		expect(ns[0].body).toBe('**bold**');
		expect(ns[0].html).toBe('<p><strong>bold</strong></p>');
	});

	it('only returns annotations for the given Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const other = seedBook(db, { title: 'Other', workId: null });
		addQuote(db, other, { text: 'theirs', location: null });
		addNote(db, id, { body: 'mine' });

		const result = loadAnnotations(db, id);
		expect(result.quotes).toEqual([]);
		expect(result.notes).toHaveLength(1);
	});
});
