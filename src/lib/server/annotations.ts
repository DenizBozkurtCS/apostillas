/**
 * The store-facing side of a Book's Quotes and Notes (see GLOSSARY.md).
 *
 * Both belong to a Book (not to any Read). Every mutation is scoped to
 * `bookId`, so a forged id from the browser can only ever touch the Book on
 * screen.
 *
 * Whether Quotes and Notes may be *added* at all depends on the Book's Reading
 * Status — that rule lives in the pure domain (`canAnnotate`); this module just
 * writes rows. Note bodies are Markdown, rendered to sanitised HTML on load.
 */

import { and, desc, eq } from 'drizzle-orm';
import { renderMarkdown } from '../markdown';
import type { Db } from './books';
import { notes, quotes } from './db/schema';

/** A Quote as the Book page renders it. */
export interface QuoteRow {
	id: number;
	text: string;
	location: string | null;
	createdAt: string;
}

/** A Note as the Book page renders it: the raw Markdown plus sanitised HTML. */
export interface NoteRow {
	id: number;
	body: string;
	html: string;
	createdAt: string;
}

/** Fields for adding or editing a Quote. */
export interface QuoteInput {
	text: string;
	location: string | null;
}

/** Fields for adding or editing a Note. */
export interface NoteInput {
	body: string;
}

/** Add a Quote to a Book. Returns its id, or null when the text is blank. */
export function addQuote(db: Db, bookId: number, input: QuoteInput): number | null {
	const text = input.text.trim();
	if (text === '') return null;
	return db
		.insert(quotes)
		.values({
			bookId,
			text,
			location: input.location?.trim() || null
		})
		.returning({ id: quotes.id })
		.get().id;
}

/** Add a Note to a Book. Returns its id, or null when the body is blank. */
export function addNote(db: Db, bookId: number, input: NoteInput): number | null {
	const body = input.body.trim();
	if (body === '') return null;
	return db
		.insert(notes)
		.values({ bookId, body })
		.returning({ id: notes.id })
		.get().id;
}

/** Edit a Quote scoped to its Book. Returns false on blank text or no match. */
export function editQuote(db: Db, bookId: number, quoteId: number, input: QuoteInput): boolean {
	const text = input.text.trim();
	if (text === '') return false;
	const res = db
		.update(quotes)
		.set({
			text,
			location: input.location?.trim() || null
		})
		.where(and(eq(quotes.id, quoteId), eq(quotes.bookId, bookId)))
		.run();
	return res.changes > 0;
}

/** Edit a Note scoped to its Book. Returns false on blank body or no match. */
export function editNote(db: Db, bookId: number, noteId: number, input: NoteInput): boolean {
	const body = input.body.trim();
	if (body === '') return false;
	const res = db
		.update(notes)
		.set({ body })
		.where(and(eq(notes.id, noteId), eq(notes.bookId, bookId)))
		.run();
	return res.changes > 0;
}

/** Delete a Quote, scoped to its Book. */
export function deleteQuote(db: Db, bookId: number, quoteId: number): void {
	db.delete(quotes).where(and(eq(quotes.id, quoteId), eq(quotes.bookId, bookId))).run();
}

/** Delete a Note, scoped to its Book. */
export function deleteNote(db: Db, bookId: number, noteId: number): void {
	db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.bookId, bookId))).run();
}

/**
 * Load a Book's Quotes and Notes, newest first. Each Note carries its raw
 * Markdown `body` (for editing) and the sanitised `html` to display.
 */
export function loadAnnotations(db: Db, bookId: number): { quotes: QuoteRow[]; notes: NoteRow[] } {
	const quoteRows = db
		.select()
		.from(quotes)
		.where(eq(quotes.bookId, bookId))
		.orderBy(desc(quotes.createdAt), desc(quotes.id))
		.all();
	const noteRows = db
		.select()
		.from(notes)
		.where(eq(notes.bookId, bookId))
		.orderBy(desc(notes.createdAt), desc(notes.id))
		.all();

	return {
		quotes: quoteRows.map((q) => ({
			id: q.id,
			text: q.text,
			location: q.location,
			createdAt: q.createdAt
		})),
		notes: noteRows.map((n) => ({
			id: n.id,
			body: n.body,
			html: renderMarkdown(n.body),
			createdAt: n.createdAt
		}))
	};
}
