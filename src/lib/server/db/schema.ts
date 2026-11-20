import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * A Book is a work as its author wrote it (see GLOSSARY.md). It is the unit
 * everything else attaches to. This scaffold defines the minimal Book; the
 * full domain model is built out in a later issue.
 */
export const books = sqliteTable('books', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});
