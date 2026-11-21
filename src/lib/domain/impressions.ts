/**
 * Pure rules for Impressions (see GLOSSARY.md and ADR-0006): a dated record of
 * reading a Book, with an optional Rating, an optional short review, and the
 * Reread / Didn't finish markers. Leaving one ends Reading and, unless it is
 * Didn't finish, marks the Book read (src/lib/server/impressions.ts).
 */

import { isValidRating } from './reading';

/** Longest short review, in characters; anything longer belongs in a Note. */
export const MAX_REVIEW = 1000;

export interface Impression {
	id: number;
	/** ISO day, `YYYY-MM-DD`. */
	date: string;
	rating: number | null;
	review: string | null;
	reread: boolean;
	didNotFinish: boolean;
}

export type ImpressionInput = Omit<Impression, 'id'>;

export type ImpressionCheck = { ok: true; input: ImpressionInput } | { ok: false; error: string };

/** Whether `s` is a real calendar day written `YYYY-MM-DD`. */
export function isIsoDay(s: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const d = new Date(`${s}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Validate the fields of an Impression form. The date is required; the review
 * is trimmed (blank means none) and capped at {@link MAX_REVIEW}; line breaks
 * are normalised to `\n`.
 */
export function checkImpression(fields: {
	date: string | null;
	rating: number | null;
	review: string | null;
	reread: boolean;
	didNotFinish: boolean;
}): ImpressionCheck {
	const date = fields.date?.trim() ?? '';
	if (date === '') return { ok: false, error: 'An Impression needs a date.' };
	if (!isIsoDay(date)) return { ok: false, error: 'That date is not valid.' };
	if (fields.rating != null && !isValidRating(fields.rating)) {
		return { ok: false, error: 'Rating must be from ½ to 5 stars, in half-star steps.' };
	}
	const review = (fields.review ?? '').replace(/\r\n?/g, '\n').trim();
	if (review.length > MAX_REVIEW) {
		return {
			ok: false,
			error: `Keep the review under ${MAX_REVIEW} characters; longer thoughts belong in a Note.`
		};
	}
	return {
		ok: true,
		input: {
			date,
			rating: fields.rating ?? null,
			review: review === '' ? null : review,
			reread: fields.reread,
			didNotFinish: fields.didNotFinish
		}
	};
}

/** Newest first by date; on the same day, the most recently saved first. */
export function newestFirst<T extends { id: number; date: string }>(items: readonly T[]): T[] {
	return [...items].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.id - a.id));
}
