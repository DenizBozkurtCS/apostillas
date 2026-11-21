import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { books, notes, quotes, reads } from './db/schema';
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

function seedRead(db: BetterSQLite3Database<typeof schema>, bookId: number, over: Partial<typeof reads.$inferInsert> = {}) {
	return db
		.insert(reads)
		.values({ bookId, outcome: 'open', startDate: '2026-01-01', ...over })
		.returning({ id: reads.id })
		.get().id;
}

describe('addQuote', () => {
	it('adds a Quote with text, location and a linked Read', () => {
		const db = testDb();
		const id = seedBook(db);
		const readId = seedRead(db, id);
		const quoteId = addQuote(db, id, { text: 'Fear is the mind-killer.', location: 'p. 8', readId });
		const row = db.select().from(quotes).where(eq(quotes.id, quoteId!)).get()!;
		expect(row).toMatchObject({ bookId: id, text: 'Fear is the mind-killer.', location: 'p. 8', readId });
	});

	it('refuses empty text', () => {
		const db = testDb();
		const id = seedBook(db);
		expect(addQuote(db, id, { text: '   ', location: null, readId: null })).toBeNull();
		expect(db.select().from(quotes).all()).toEqual([]);
	});

	it('stores null when the linked Read belongs to another Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const other = seedBook(db, { title: 'Other', workId: null });
		const foreignRead = seedRead(db, other);
		const quoteId = addQuote(db, id, { text: 'q', location: null, readId: foreignRead });
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId!)).get()!.readId).toBeNull();
	});
});

describe('addNote', () => {
	it('adds a Note with a Markdown body', () => {
		const db = testDb();
		const id = seedBook(db);
		const noteId = addNote(db, id, { body: '# A thought', readId: null });
		expect(db.select().from(notes).where(eq(notes.id, noteId!)).get()).toMatchObject({
			bookId: id,
			body: '# A thought',
			readId: null
		});
	});

	it('refuses an empty body', () => {
		const db = testDb();
		const id = seedBook(db);
		expect(addNote(db, id, { body: '  \n ', readId: null })).toBeNull();
		expect(db.select().from(notes).all()).toEqual([]);
	});
});

describe('editQuote / editNote', () => {
	it('updates a Quote scoped to its Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const readId = seedRead(db, id);
		const quoteId = addQuote(db, id, { text: 'old', location: null, readId: null })!;
		expect(editQuote(db, id, quoteId, { text: 'new', location: 'p. 1', readId })).toBe(true);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()).toMatchObject({
			text: 'new',
			location: 'p. 1',
			readId
		});
	});

	it('does not edit a Quote that belongs to another Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const other = seedBook(db, { title: 'Other', workId: null });
		const quoteId = addQuote(db, other, { text: 'theirs', location: null, readId: null })!;
		expect(editQuote(db, id, quoteId, { text: 'hacked', location: null, readId: null })).toBe(false);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()!.text).toBe('theirs');
	});

	it('refuses blank edited text/body', () => {
		const db = testDb();
		const id = seedBook(db);
		const quoteId = addQuote(db, id, { text: 'keep', location: null, readId: null })!;
		expect(editQuote(db, id, quoteId, { text: ' ', location: null, readId: null })).toBe(false);
		const noteId = addNote(db, id, { body: 'keep', readId: null })!;
		expect(editNote(db, id, noteId, { body: ' ', readId: null })).toBe(false);
	});

	it('updates a Note body', () => {
		const db = testDb();
		const id = seedBook(db);
		const noteId = addNote(db, id, { body: 'old', readId: null })!;
		expect(editNote(db, id, noteId, { body: 'new body', readId: null })).toBe(true);
		expect(db.select().from(notes).where(eq(notes.id, noteId)).get()!.body).toBe('new body');
	});
});

describe('deleteQuote / deleteNote', () => {
	it('deletes a Quote scoped to its Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const quoteId = addQuote(db, id, { text: 'q', location: null, readId: null })!;
		deleteQuote(db, id, quoteId);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()).toBeUndefined();
	});

	it('does not delete a Quote belonging to another Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const other = seedBook(db, { title: 'Other', workId: null });
		const quoteId = addQuote(db, other, { text: 'theirs', location: null, readId: null })!;
		deleteQuote(db, id, quoteId);
		expect(db.select().from(quotes).where(eq(quotes.id, quoteId)).get()).toBeDefined();
	});

	it('deletes a Note scoped to its Book', () => {
		const db = testDb();
		const id = seedBook(db);
		const noteId = addNote(db, id, { body: 'n', readId: null })!;
		deleteNote(db, id, noteId);
		expect(db.select().from(notes).where(eq(notes.id, noteId)).get()).toBeUndefined();
	});
});

describe('loadAnnotations', () => {
	it('returns Quotes and Notes newest first with rendered Note HTML', () => {
		const db = testDb();
		const id = seedBook(db);
		const q1 = addQuote(db, id, { text: 'first', location: null, readId: null })!;
		const q2 = addQuote(db, id, { text: 'second', location: 'p. 2', readId: null })!;
		addNote(db, id, { body: '**bold**', readId: null })!;

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
		addQuote(db, other, { text: 'theirs', location: null, readId: null });
		addNote(db, id, { body: 'mine', readId: null });

		const result = loadAnnotations(db, id);
		expect(result.quotes).toEqual([]);
		expect(result.notes).toHaveLength(1);
	});
});
