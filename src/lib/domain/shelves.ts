/**
 * Shelves (see GLOSSARY.md): naming rules. A Shelf's web address is a slug
 * derived from its name, so the slug must be non-empty and unique.
 */

/** Longest Shelf name accepted, in characters. */
export const MAX_SHELF_NAME = 60;
/** Longest Shelf description accepted, in characters. */
export const MAX_SHELF_DESCRIPTION = 500;

/**
 * The web address for a Shelf name: lowercased, runs of spaces (and `-`/`_`)
 * become one `-`, other punctuation is dropped, letters such as ç and ü stay.
 * "Summer 2027!" → "summer-2027". May be empty for a name with no letters or
 * numbers.
 */
export function shelfSlug(name: string): string {
	return name
		.normalize('NFC')
		.toLocaleLowerCase()
		.replace(/[\s_-]+/gu, '-')
		.replace(/[^\p{L}\p{N}-]/gu, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

export type ShelfNameCheck = { ok: true; name: string; slug: string } | { ok: false; error: string };

/** Tidy a typed Shelf name and derive its slug, or say why it can't be used. */
export function checkShelfName(input: string): ShelfNameCheck {
	const name = input.trim().replace(/\s+/g, ' ');
	if (name === '') return { ok: false, error: 'Give the Shelf a name.' };
	if ([...name].length > MAX_SHELF_NAME) {
		return { ok: false, error: `Shelf names can be at most ${MAX_SHELF_NAME} characters.` };
	}
	const slug = shelfSlug(name);
	if (slug === '') return { ok: false, error: 'A Shelf name needs at least one letter or number.' };
	return { ok: true, name, slug };
}
