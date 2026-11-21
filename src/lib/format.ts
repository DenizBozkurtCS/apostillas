/** Presentation helpers shared by the Reading Status list screens. */

import type { ReadingStatus } from './domain/reading';

/**
 * Format a stored date for display. Accepts an ISO day (`YYYY-MM-DD`) or a
 * SQLite timestamp (`YYYY-MM-DD HH:MM:SS`); only the day part is shown. Returns
 * `''` for null/empty, and the raw day if it cannot be parsed.
 */
export function formatDay(value: string | null | undefined): string {
	if (!value) return '';
	const day = value.slice(0, 10);
	const date = new Date(`${day}T00:00:00`);
	if (Number.isNaN(date.getTime())) return day;
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * The name the UI shows for a Reading Status's list. The domain keeps its
 * glossary names; the screens call Want to read "Bookstack" and the Finished
 * list "Books".
 */
export function listName(status: ReadingStatus): string {
	if (status === 'Want to read') return 'Bookstack';
	if (status === 'Finished') return 'Books';
	return status;
}

/** Every rating a reader can pick: ½ to 5 in half-star steps. */
export const RATING_STEPS: readonly number[] = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/** A rating as text with a ½ for half stars (`4½`, `½`), or `''` when unrated. */
export function formatRating(rating: number | null | undefined): string {
	if (rating == null) return '';
	const whole = Math.floor(rating);
	const half = rating - whole >= 0.5;
	return (whole > 0 ? String(whole) : '') + (half ? '½' : '');
}
