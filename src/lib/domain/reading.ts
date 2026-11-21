/**
 * Pure domain module for Reading Statuses and Ratings.
 *
 * See GLOSSARY.md for the vocabulary and docs/adr/0006 for the rules: the three
 * Reading Statuses are independent switches the reader sets directly, so a
 * Book can have any of them, all of them, or none. Setting one records no date
 * the reader sees; the store keeps the moment it was switched on only to order
 * the lists.
 */

/** Where a Book stands for the reader. */
export type ReadingStatus = 'Want to read' | 'Reading' | 'Finished';

/** A Reading Status as forms and code name it. */
export type StatusKey = 'want' | 'reading' | 'finished';

export const STATUS_KEYS: readonly StatusKey[] = ['want', 'reading', 'finished'];

export const STATUS_NAMES: Record<StatusKey, ReadingStatus> = {
	want: 'Want to read',
	reading: 'Reading',
	finished: 'Finished'
};

/**
 * Which Reading Statuses a Book has. Each is the moment it was switched on
 * (an ISO timestamp, only used for ordering), or null when off.
 */
export interface Statuses {
	want: string | null;
	reading: string | null;
	finished: string | null;
}

export const NO_STATUSES: Statuses = { want: null, reading: null, finished: null };

/** A form value as a status key, or null when it is not one. */
export function parseStatusKey(value: unknown): StatusKey | null {
	return typeof value === 'string' && (STATUS_KEYS as readonly string[]).includes(value)
		? (value as StatusKey)
		: null;
}

/**
 * The Statuses after switching `key` on or off at `now`. Switching on a status
 * that is already on keeps its original moment, so the lists don't reshuffle.
 */
export function switchStatus(current: Statuses, key: StatusKey, on: boolean, now: string): Statuses {
	return { ...current, [key]: on ? (current[key] ?? now) : null };
}

/** A rating is ½ to 5 stars in half-star steps. */
export function isValidRating(rating: number): boolean {
	return Number.isInteger(rating * 2) && rating >= 0.5 && rating <= 5;
}
