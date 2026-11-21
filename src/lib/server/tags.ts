/**
 * The store-facing side of Tags (apostillas-v2/03). A Tag is a row in
 * `book_tags` per Book carrying it, so a Tag no Book carries simply stops
 * existing, and deleting a Book removes its Tags through the cascade.
 */

import { and, asc, eq } from 'drizzle-orm';
import { normalizeTag } from '../domain/tags';
import type { Db } from './books';
import { bookTags } from './db/schema';

/** A Book's Tags, alphabetically. */
export function tagsForBook(db: Db, bookId: number): string[] {
	return db
		.select({ name: bookTags.name })
		.from(bookTags)
		.where(eq(bookTags.bookId, bookId))
		.orderBy(asc(bookTags.name))
		.all()
		.map((r) => r.name);
}

/** Every Tag some Book carries, alphabetically (for suggestions). */
export function allTags(db: Db): string[] {
	return db
		.selectDistinct({ name: bookTags.name })
		.from(bookTags)
		.orderBy(asc(bookTags.name))
		.all()
		.map((r) => r.name);
}

/**
 * Put a Tag on a Book. Returns the Tag's canonical name, or null when `input`
 * can't be a Tag. Adding a Tag the Book already carries is a no-op.
 */
export function addTag(db: Db, bookId: number, input: string): string | null {
	const name = normalizeTag(input);
	if (name === null) return null;
	db.insert(bookTags).values({ bookId, name }).onConflictDoNothing().run();
	return name;
}

/** Take a Tag off a Book (any spelling of it). */
export function removeTag(db: Db, bookId: number, input: string): void {
	const name = normalizeTag(input);
	if (name === null) return;
	db.delete(bookTags).where(and(eq(bookTags.bookId, bookId), eq(bookTags.name, name))).run();
}
