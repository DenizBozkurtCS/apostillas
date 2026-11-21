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

/**
 * A Book's Reading Status as its badge shows it: like the list name, except a
 * Finished Book is still "Finished" ("Books" names the shelf, not a status).
 */
export function statusLabel(status: ReadingStatus): string {
	return status === 'Finished' ? 'Finished' : listName(status);
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

/**
 * The confirmation shown before deleting a Read. When the delete would change
 * the Book's Reading Status it says so; a move to Want to read also warns that
 * existing Quotes and Notes stay but no new ones can be added until the Book is
 * started again (ADR-0005; Quotes and Notes cannot be added to a Want to read
 * Book).
 */
export function deleteReadMessage(opts: {
	title: string;
	currentStatus: ReadingStatus;
	statusAfterDelete: ReadingStatus;
	annotationCount: number;
}): string {
	const { title, currentStatus, statusAfterDelete, annotationCount } = opts;
	if (statusAfterDelete === currentStatus) {
		return 'Delete this Read? Its dates and rating will be lost.';
	}

	const parts = ['Delete this Read?', `${title} will move to ${listName(statusAfterDelete)}.`];
	if (statusAfterDelete === 'Want to read') {
		if (annotationCount > 0) {
			const label = annotationCount === 1 ? 'Quote or Note stays' : 'Quotes and Notes stay';
			parts.push(
				`Its ${annotationCount} ${label}, but you can’t add new ones until you start it again.`
			);
		} else {
			parts.push('You can’t add Quotes or Notes until you start it again.');
		}
	}
	return parts.join(' ');
}
