import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * A Book is a work as its author wrote it (see GLOSSARY.md), not a specific
 * Edition (ADR-0002). Edition details (ISBN, page count, cover) are optional
 * attributes. Metadata is copied from Open Library when added (ADR-0003).
 */
export const books = sqliteTable('books', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	/** JSON-encoded array of author names. */
	authors: text('authors').notNull().default('[]'),
	description: text('description').notNull().default(''),
	/** Open Library work ID, when the Book came from a search. */
	workId: text('work_id'),
	/** Free-text "why / recommended by" for a Want to read Book. */
	whyRecommended: text('why_recommended'),
	// Edition fields (all optional, ADR-0002).
	isbn: text('isbn'),
	pageCount: integer('page_count'),
	coverPath: text('cover_path'),
	/** Date added. */
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
},
	// One Book per Open Library work (ADR-0002); NULLs (manual and Google Books) don't collide.
	(table) => [uniqueIndex('books_work_id_unique').on(table.workId)]
);

/**
 * A Read is one pass through a Book. Reading Status and Reread are derived from
 * a Book's Reads, never stored (ADR-0005); see src/lib/domain/reading.ts.
 * Deleting a Book cascades to its Reads.
 */
export const reads = sqliteTable('reads', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bookId: integer('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	/** Null for a logged past Read with no recorded start. */
	startDate: text('start_date'),
	endDate: text('end_date'),
	outcome: text('outcome', { enum: ['open', 'finished', 'abandoned'] }).notNull(),
	/** ½ to 5 in half-star steps, or null. SQLite keeps 4.5 as a REAL in this INTEGER column. */
	rating: integer('rating'),
	/** The reader ticked "I've read this before". */
	readBefore: integer('read_before', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

/**
 * A Quote is a passage copied verbatim from a Book, optionally tied to one of
 * its Reads. Deleting the Read unlinks the Quote (readId → null) but keeps it
 * on the Book; deleting the Book cascades.
 */
export const quotes = sqliteTable('quotes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bookId: integer('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	readId: integer('read_id').references(() => reads.id, { onDelete: 'set null' }),
	text: text('text').notNull(),
	/** Page or location the Quote came from. */
	location: text('location'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

/**
 * A Note is the reader's own writing about a Book (Markdown body), optionally
 * tied to one Read. Unlinked when its Read is deleted; cascades with the Book.
 */
export const notes = sqliteTable('notes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bookId: integer('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	readId: integer('read_id').references(() => reads.id, { onDelete: 'set null' }),
	/** Markdown. */
	body: text('body').notNull(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});
