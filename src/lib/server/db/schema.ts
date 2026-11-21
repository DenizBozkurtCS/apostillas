import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
	// Edition fields (all optional, ADR-0002).
	isbn: text('isbn'),
	pageCount: integer('page_count'),
	coverPath: text('cover_path'),
	/**
	 * Reading Statuses (ADR-0006): each is on when it holds the moment it was
	 * switched on (SQLite timestamp), off when null. The moment only orders the
	 * lists and is never shown.
	 */
	wantSince: text('want_since'),
	readingSince: text('reading_since'),
	finishedSince: text('finished_since'),
	/** The Book's Rating, ½ to 5 in half-star steps: whichever was set most recently. */
	rating: real('rating'),
	/** Date added. */
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
},
	// One Book per Open Library work (ADR-0002); NULLs (manual and Google Books) don't collide.
	(table) => [uniqueIndex('books_work_id_unique').on(table.workId)]
);

/**
 * An Impression: a dated record of reading a Book, with an optional Rating and
 * short review, and Reread / Didn't finish markers the reader ticks (see
 * GLOSSARY.md). Leaving one switches Reading off and, unless Didn't finish, Finished on (ADR-0006).
 * Deleting a Book cascades.
 */
export const impressions = sqliteTable('impressions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bookId: integer('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	/** ISO day (`YYYY-MM-DD`). */
	date: text('date').notNull(),
	/** ½ to 5 in half-star steps, or null. */
	rating: real('rating'),
	/** Short plain-text review, or null. */
	review: text('review'),
	reread: integer('reread', { mode: 'boolean' }).notNull().default(false),
	didNotFinish: integer('did_not_finish', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

/**
 * A Quote is a passage copied verbatim from a Book. It belongs to the Book,
 * not to any Impression; deleting the Book cascades.
 */
export const quotes = sqliteTable('quotes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bookId: integer('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	text: text('text').notNull(),
	/** Page or location the Quote came from. */
	location: text('location'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

/**
 * A Note is the reader's own writing about a Book (Markdown body). It belongs
 * to the Book; cascades with the Book.
 */
export const notes = sqliteTable('notes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bookId: integer('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	/** Markdown. */
	body: text('body').notNull(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

/**
 * A Tag on a Book (see GLOSSARY.md). Tags have no table of their own: a Tag is
 * just a name that at least one Book carries, so it disappears with its last
 * row. `name` is normalised (lowercase, no `#`; see src/lib/domain/tags.ts).
 * Deleting a Book cascades.
 */
export const bookTags = sqliteTable(
	'book_tags',
	{
		bookId: integer('book_id')
			.notNull()
			.references(() => books.id, { onDelete: 'cascade' }),
		name: text('name').notNull()
	},
	(table) => [primaryKey({ columns: [table.bookId, table.name] })]
);

/**
 * A Shelf: a named collection of Books the reader curates and arranges (see
 * GLOSSARY.md). `slug` is derived from the name and is its web address, so it
 * is unique (src/lib/domain/shelves.ts). `position` orders the Bookcase,
 * smallest first; a new Shelf takes one less than the current smallest.
 */
export const shelves = sqliteTable(
	'shelves',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		description: text('description'),
		position: integer('position').notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
	},
	(table) => [uniqueIndex('shelves_slug_unique').on(table.slug)]
);

/**
 * A Book on a Shelf, at `position` (smallest first). Deleting the Shelf or the
 * Book removes the row, never the other side.
 */
export const shelfBooks = sqliteTable(
	'shelf_books',
	{
		shelfId: integer('shelf_id')
			.notNull()
			.references(() => shelves.id, { onDelete: 'cascade' }),
		bookId: integer('book_id')
			.notNull()
			.references(() => books.id, { onDelete: 'cascade' }),
		position: integer('position').notNull()
	},
	(table) => [primaryKey({ columns: [table.shelfId, table.bookId] })]
);
