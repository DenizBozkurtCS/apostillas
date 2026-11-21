/**
 * The store-facing side of the Notes & Quotes page (apostillas-v2/02): every
 * Quote and Note across all Books, newest first, each with the Book it belongs
 * to, plus the Books a new Quote or Note can be written about.
 *
 * Mutations reuse ./annotations, which scopes every write to a Book; this
 * module only reads.
 */

import { desc, eq } from 'drizzle-orm';
import { canAnnotate, defaultAnnotationRead, readingStatus, readsNewestFirst } from '../domain/reading';
import type { Outcome } from '../domain/reading';
import { renderMarkdown } from '../markdown';
import type { Db } from './books';
import { books, notes, quotes } from './db/schema';
import { loadBooksWithReads } from './lists';

/** The Book shown on a Notes & Quotes card. */
export interface FeedBook {
	id: number;
	title: string;
	authors: string[];
	coverPath: string | null;
}

export interface FeedNote {
	id: number;
	body: string;
	/** Sanitised HTML rendered from `body`. */
	html: string;
	readId: number | null;
	createdAt: string;
	book: FeedBook;
}

export interface FeedQuote {
	id: number;
	text: string;
	location: string | null;
	readId: number | null;
	createdAt: string;
	book: FeedBook;
}

/** A Read as the Book picker offers it for linking. */
export interface PickerRead {
	id: number;
	outcome: Outcome;
	startDate: string | null;
	endDate: string | null;
}

/** A Book a new Quote or Note can be written about. */
export interface AnnotatableBook {
	id: number;
	title: string;
	authors: string[];
	/** Newest first. */
	reads: PickerRead[];
	/** The Read a new Quote or Note links to unless the reader picks another. */
	defaultReadId: number | null;
}

function parseAuthors(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		if (Array.isArray(parsed)) return parsed.filter((a): a is string => typeof a === 'string');
	} catch {
		/* fall through */
	}
	return [];
}

/** Every Note and Quote, newest first, each with its Book. */
export function loadFeed(db: Db): { notes: FeedNote[]; quotes: FeedQuote[] } {
	const bookCols = {
		bookId: books.id,
		title: books.title,
		authors: books.authors,
		coverPath: books.coverPath
	};
	const toBook = (r: { bookId: number; title: string; authors: string; coverPath: string | null }) => ({
		id: r.bookId,
		title: r.title,
		authors: parseAuthors(r.authors),
		coverPath: r.coverPath
	});

	const noteRows = db
		.select({ ...bookCols, id: notes.id, body: notes.body, readId: notes.readId, createdAt: notes.createdAt })
		.from(notes)
		.innerJoin(books, eq(books.id, notes.bookId))
		.orderBy(desc(notes.createdAt), desc(notes.id))
		.all();
	const quoteRows = db
		.select({
			...bookCols,
			id: quotes.id,
			text: quotes.text,
			location: quotes.location,
			readId: quotes.readId,
			createdAt: quotes.createdAt
		})
		.from(quotes)
		.innerJoin(books, eq(books.id, quotes.bookId))
		.orderBy(desc(quotes.createdAt), desc(quotes.id))
		.all();

	return {
		notes: noteRows.map((r) => ({
			id: r.id,
			body: r.body,
			html: renderMarkdown(r.body),
			readId: r.readId,
			createdAt: r.createdAt,
			book: toBook(r)
		})),
		quotes: quoteRows.map((r) => ({
			id: r.id,
			text: r.text,
			location: r.location,
			readId: r.readId,
			createdAt: r.createdAt,
			book: toBook(r)
		}))
	};
}

/**
 * The Books a new Quote or Note can be written about (any Reading Status but
 * Want to read), by title, each with its Reads for the "Linked Read" choice.
 */
export function annotatableBooks(db: Db): AnnotatableBook[] {
	return loadBooksWithReads(db)
		.filter(({ reads }) => canAnnotate(readingStatus(reads)))
		.map(({ book, reads }) => ({
			id: book.id,
			title: book.title,
			authors: book.authors,
			reads: readsNewestFirst(reads).map((r) => ({
				id: r.id,
				outcome: r.outcome,
				startDate: r.startDate,
				endDate: r.endDate
			})),
			defaultReadId: defaultAnnotationRead(reads)?.id ?? null
		}))
		.sort((a, b) => a.title.localeCompare(b.title));
}

/** Whether a Book exists and can take new Quotes and Notes. */
export function canAnnotateBook(db: Db, bookId: number): boolean {
	return annotatableBooks(db).some((b) => b.id === bookId);
}
