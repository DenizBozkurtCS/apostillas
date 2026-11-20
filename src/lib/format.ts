/** Presentation helpers shared by the Reading Status list screens. */

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

/** A 1–5 rating as filled/empty stars, or `''` when unrated. */
export function ratingStars(rating: number | null | undefined): string {
	if (rating == null) return '';
	const n = Math.max(0, Math.min(5, Math.round(rating)));
	return '★'.repeat(n) + '☆'.repeat(5 - n);
}
