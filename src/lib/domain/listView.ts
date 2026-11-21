/**
 * Sorting and filtering a Library list on screen (apostillas-v2/04). Pure:
 * the list pages keep the choices in component state (never in the URL) and
 * run them through here.
 *
 * Filters combine with AND; several Tags combine with OR among themselves, so
 * (#scifi OR #classic) AND 4★+ AND "herbert".
 */

import type { BaseItem } from './lists';

/** How a list can be ordered. `recent` means the list's own date, newest first. */
export type SortKey = 'recent' | 'rating' | 'title' | 'author';

/** A sort and its direction: `title` is A–Z, `title:reversed` Z–A, and so on. */
export type SortChoice = SortKey | `${SortKey}:reversed`;

export interface ListFilter {
	/** Free text matched against title and authors (every word must match). */
	text: string;
	/** Tag names; a Book matches when it carries any of them. Empty = no Tag filter. */
	tags: string[];
	/** Minimum rating (Books only), or null for any. */
	minRating: number | null;
	/** A year the Book has an Impression in (Books only), or null for any. */
	year: number | null;
}

export const NO_FILTER: ListFilter = { text: '', tags: [], minRating: null, year: null };

/** Whether any filter is set. */
export function isFiltering(f: ListFilter): boolean {
	return f.text.trim() !== '' || f.tags.length > 0 || f.minRating != null || f.year != null;
}

/** Lowercase and strip accents, so "Garcia" finds "García". */
function fold(s: string): string {
	return s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

/** The fields filtering and sorting look at beyond {@link BaseItem}. */
export interface ViewItem extends BaseItem {
	rating?: number | null;
	/** Years the Book has Impressions in. */
	years?: number[];
}

/** The items that pass every filter, in their original order. */
export function filterItems<T extends ViewItem>(items: readonly T[], f: ListFilter): T[] {
	const words = fold(f.text).split(/\s+/).filter(Boolean);
	return items.filter((item) => {
		if (words.length > 0) {
			const hay = fold(`${item.title} ${item.authors.join(' ')}`);
			if (!words.every((w) => hay.includes(w))) return false;
		}
		if (f.tags.length > 0 && !f.tags.some((t) => item.tags.includes(t))) return false;
		if (f.minRating != null && (item.rating == null || item.rating < f.minRating)) return false;
		if (f.year != null && !item.years?.includes(f.year)) return false;
		return true;
	});
}

/** Surname of the first author ("Frank Herbert" → "herbert"), for author order. */
function authorKey(item: BaseItem): string {
	const first = item.authors[0]?.trim() ?? '';
	const words = first.split(/\s+/);
	return fold(words[words.length - 1] ?? '');
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/**
 * The items in `choice` order. `recent` keeps the incoming order, which is each
 * list's default (see buildLists). Title and author are A–Z; rating is high to
 * low. `:reversed` flips each: oldest first, Z–A, low to high. Unrated Books
 * stay last either way, and ties keep the incoming (most recent first) order.
 */
export function sortItems<T extends ViewItem>(items: readonly T[], choice: SortChoice): T[] {
	const [key, flag] = choice.split(':') as [SortKey, string | undefined];
	const dir = flag === 'reversed' ? -1 : 1;
	if (key === 'recent') return dir === 1 ? [...items] : [...items].reverse();
	const indexed = items.map((item, i) => ({ item, i }));
	const cmp: Record<SortKey, (a: T, b: T) => number> = {
		recent: () => 0,
		title: (a, b) => collator.compare(a.title, b.title),
		author: (a, b) =>
			collator.compare(authorKey(a), authorKey(b)) || collator.compare(a.title, b.title),
		rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
	};
	const unrated = (t: T) => key === 'rating' && t.rating == null;
	return indexed
		.sort(
			(a, b) =>
				Number(unrated(a.item)) - Number(unrated(b.item)) ||
				dir * cmp[key](a.item, b.item) ||
				a.i - b.i
		)
		.map((x) => x.item);
}

/** Distinct years the items have Impressions in, newest first. */
export function impressionYears(items: readonly ViewItem[]): number[] {
	return [...new Set(items.flatMap((i) => i.years ?? []))].sort((a, b) => b - a);
}

/** Distinct Tags across items, alphabetically. */
export function tagsIn(items: readonly BaseItem[]): string[] {
	return [...new Set(items.flatMap((i) => i.tags))].sort();
}
