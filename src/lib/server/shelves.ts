/**
 * The store-facing side of Shelves and the Bookcase (apostillas-v3). Naming
 * rules live in the pure ../domain/shelves; this module writes rows and reads
 * Shelves with their Books, in the reader's order.
 */

import { and, asc, eq, gt, inArray, lt, desc, min, max, ne } from 'drizzle-orm';
import { currentRating } from '../domain/lists';
import { readingStatus } from '../domain/reading';
import { MAX_SHELF_DESCRIPTION, checkShelfName } from '../domain/shelves';
import type { Db } from './books';
import { shelfBooks, shelves } from './db/schema';
import { loadBooksWithReads } from './lists';

/** A Book as a Shelf tile shows it. */
export interface ShelfBook {
	bookId: number;
	title: string;
	authors: string[];
	coverPath: string | null;
	/** The current rating, only for a Finished Book. */
	rating: number | null;
}

export interface ShelfWithBooks {
	id: number;
	name: string;
	slug: string;
	description: string | null;
	books: ShelfBook[];
}

export type ShelfResult = { ok: true; slug: string } | { ok: false; error: string };

function tidyDescription(input: string | null | undefined): string | null {
	const d = (input ?? '').trim();
	return d === '' ? null : d.slice(0, MAX_SHELF_DESCRIPTION);
}

/** Every Shelf in Bookcase order, each with its Books in Shelf order. */
export function loadBookcase(db: Db): ShelfWithBooks[] {
	const shelfRows = db.select().from(shelves).orderBy(asc(shelves.position), asc(shelves.id)).all();
	const entries = db
		.select()
		.from(shelfBooks)
		.orderBy(asc(shelfBooks.position), asc(shelfBooks.bookId))
		.all();

	const books = new Map(
		loadBooksWithReads(db).map(({ book, reads }) => [
			book.id,
			{
				bookId: book.id,
				title: book.title,
				authors: book.authors,
				coverPath: book.coverPath,
				rating: readingStatus(reads) === 'Finished' ? currentRating(reads) : null
			} satisfies ShelfBook
		])
	);

	return shelfRows.map((s) => ({
		id: s.id,
		name: s.name,
		slug: s.slug,
		description: s.description,
		books: entries.filter((e) => e.shelfId === s.id).flatMap((e) => books.get(e.bookId) ?? [])
	}));
}

/** One Shelf by its slug, with its Books, or null. */
export function loadShelf(db: Db, slug: string): ShelfWithBooks | null {
	return loadBookcase(db).find((s) => s.slug === slug) ?? null;
}

/** Whether another Shelf already uses `slug`. */
function slugTaken(db: Db, slug: string, exceptId?: number): string | null {
	const row = db
		.select({ name: shelves.name })
		.from(shelves)
		.where(exceptId == null ? eq(shelves.slug, slug) : and(eq(shelves.slug, slug), ne(shelves.id, exceptId)))
		.get();
	return row?.name ?? null;
}

/** Make a Shelf at the top of the Bookcase. */
export function createShelf(db: Db, nameInput: string, description?: string | null): ShelfResult {
	const check = checkShelfName(nameInput);
	if (!check.ok) return check;
	const taken = slugTaken(db, check.slug);
	if (taken) return { ok: false, error: `You already have a Shelf called ${taken}.` };
	const top = db.select({ p: min(shelves.position) }).from(shelves).get()?.p ?? 1;
	db.insert(shelves)
		.values({ name: check.name, slug: check.slug, description: tidyDescription(description), position: top - 1 })
		.run();
	return { ok: true, slug: check.slug };
}

/** Rename a Shelf; its slug (web address) follows the new name. */
export function renameShelf(db: Db, id: number, nameInput: string): ShelfResult {
	const check = checkShelfName(nameInput);
	if (!check.ok) return check;
	const taken = slugTaken(db, check.slug, id);
	if (taken) return { ok: false, error: `You already have a Shelf called ${taken}.` };
	const res = db.update(shelves).set({ name: check.name, slug: check.slug }).where(eq(shelves.id, id)).run();
	if (res.changes === 0) return { ok: false, error: 'That Shelf no longer exists.' };
	return { ok: true, slug: check.slug };
}

/** Set or clear a Shelf's description. */
export function setShelfDescription(db: Db, id: number, description: string | null): void {
	db.update(shelves).set({ description: tidyDescription(description) }).where(eq(shelves.id, id)).run();
}

/** Swap a Shelf with its neighbour above (`up`) or below (`down`) on the Bookcase. */
export function moveShelf(db: Db, id: number, direction: 'up' | 'down'): void {
	db.transaction((tx) => {
		const me = tx.select().from(shelves).where(eq(shelves.id, id)).get();
		if (!me) return;
		const neighbour = tx
			.select()
			.from(shelves)
			.where(direction === 'up' ? lt(shelves.position, me.position) : gt(shelves.position, me.position))
			.orderBy(direction === 'up' ? desc(shelves.position) : asc(shelves.position))
			.limit(1)
			.get();
		if (!neighbour) return;
		tx.update(shelves).set({ position: neighbour.position }).where(eq(shelves.id, me.id)).run();
		tx.update(shelves).set({ position: me.position }).where(eq(shelves.id, neighbour.id)).run();
	});
}

/** Delete a Shelf. Its Books stay in the library. */
export function deleteShelf(db: Db, id: number): void {
	db.delete(shelves).where(eq(shelves.id, id)).run();
}

/** Put a Book at the end of a Shelf (no-op if it's already there). */
export function addBookToShelf(db: Db, shelfId: number, bookId: number): void {
	const last = db
		.select({ p: max(shelfBooks.position) })
		.from(shelfBooks)
		.where(eq(shelfBooks.shelfId, shelfId))
		.get()?.p;
	db.insert(shelfBooks)
		.values({ shelfId, bookId, position: (last ?? 0) + 1 })
		.onConflictDoNothing()
		.run();
}

/** Take a Book off a Shelf. The Book stays in the library. */
export function removeBookFromShelf(db: Db, shelfId: number, bookId: number): void {
	db.delete(shelfBooks)
		.where(and(eq(shelfBooks.shelfId, shelfId), eq(shelfBooks.bookId, bookId)))
		.run();
}

/**
 * Save Arrange mode in one go: take `removed` Books off the Shelf, then put the
 * rest in `order`. Ids not on the Shelf are ignored; Books on the Shelf that
 * `order` leaves out keep their place after the ordered ones.
 */
export function arrangeShelf(db: Db, shelfId: number, order: number[], removed: number[]): void {
	db.transaction((tx) => {
		if (removed.length > 0) {
			tx.delete(shelfBooks)
				.where(and(eq(shelfBooks.shelfId, shelfId), inArray(shelfBooks.bookId, removed)))
				.run();
		}
		const current = tx
			.select({ bookId: shelfBooks.bookId })
			.from(shelfBooks)
			.where(eq(shelfBooks.shelfId, shelfId))
			.orderBy(asc(shelfBooks.position), asc(shelfBooks.bookId))
			.all()
			.map((r) => r.bookId);
		const onShelf = new Set(current);
		const ordered = [...new Set(order)].filter((id) => onShelf.has(id));
		const rest = current.filter((id) => !ordered.includes(id));
		[...ordered, ...rest].forEach((bookId, i) => {
			tx.update(shelfBooks)
				.set({ position: i + 1 })
				.where(and(eq(shelfBooks.shelfId, shelfId), eq(shelfBooks.bookId, bookId)))
				.run();
		});
	});
}
