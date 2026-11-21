/**
 * The store-facing side of Impressions (see src/lib/domain/impressions.ts).
 * Every change is scoped to `bookId`, so a forged id from the browser can only
 * touch the Book it names. Saving an Impression with a rating makes that the
 * Book's Rating (the most recently set one wins, ADR-0006). Leaving a new
 * Impression ends Reading and, unless it is marked Didn't finish, switches
 * Read it on; nothing else touches the Reading Statuses.
 */

import { and, eq } from 'drizzle-orm';
import {
	checkImpression,
	newestFirst,
	type Impression,
	type ImpressionCheck,
	type ImpressionInput
} from '../domain/impressions';
import { setStatus } from './book';
import type { Db } from './books';
import { books, impressions } from './db/schema';

/** Read an Impression form: `date`, `rating`, `review`, and the two tick boxes. */
export function impressionFromForm(form: FormData): ImpressionCheck {
	const text = (name: string) => {
		const v = form.get(name);
		return typeof v === 'string' ? v : null;
	};
	const ratingText = text('rating')?.trim() ?? '';
	return checkImpression({
		date: text('date'),
		rating: ratingText === '' ? null : Number(ratingText),
		review: text('review'),
		reread: form.get('reread') != null,
		didNotFinish: form.get('didNotFinish') != null
	});
}

function toImpression(r: typeof impressions.$inferSelect): Impression {
	return {
		id: r.id,
		date: r.date,
		rating: r.rating,
		review: r.review,
		reread: r.reread,
		didNotFinish: r.didNotFinish
	};
}

/** A Book's Impressions, newest first. */
export function loadImpressions(db: Db, bookId: number): Impression[] {
	return newestFirst(db.select().from(impressions).where(eq(impressions.bookId, bookId)).all().map(toImpression));
}

function rateFrom(db: Db, bookId: number, input: ImpressionInput): void {
	if (input.rating !== null) db.update(books).set({ rating: input.rating }).where(eq(books.id, bookId)).run();
}

/**
 * Add an Impression to a Book; returns its id. Leaving one means the reader
 * has stopped reading, so Reading is switched off; unless they didn't finish,
 * they have read it, so Finished ("Read it") is switched on. Want to read stays.
 */
export function addImpression(db: Db, bookId: number, input: ImpressionInput, now?: string): number {
	const id = db.insert(impressions).values({ bookId, ...input }).returning({ id: impressions.id }).get().id;
	rateFrom(db, bookId, input);
	setStatus(db, bookId, 'reading', false, now);
	if (!input.didNotFinish) setStatus(db, bookId, 'finished', true, now);
	return id;
}

/** Overwrite an Impression on this Book. False when there is no such Impression. */
export function editImpression(db: Db, bookId: number, id: number, input: ImpressionInput): boolean {
	const res = db
		.update(impressions)
		.set(input)
		.where(and(eq(impressions.id, id), eq(impressions.bookId, bookId)))
		.run();
	if (res.changes === 0) return false;
	rateFrom(db, bookId, input);
	return true;
}

/** Delete an Impression on this Book. The Book's Rating stays as it is. */
export function deleteImpression(db: Db, bookId: number, id: number): void {
	db.delete(impressions).where(and(eq(impressions.id, id), eq(impressions.bookId, bookId))).run();
}
