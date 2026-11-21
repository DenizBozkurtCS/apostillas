/**
 * Tags (see GLOSSARY.md): short, case-insensitive labels on Books. The `#` is
 * typing syntax, not part of the name, so `#SciFi`, `scifi` and `SCIFI` are
 * all the Tag `scifi`.
 */

/** Longest Tag name accepted, in characters. */
export const MAX_TAG_LENGTH = 40;

const TAG_NAME = /^[\p{L}\p{N}-]+$/u;

/**
 * The canonical name for what the reader typed, or null when it can't be a Tag:
 * leading `#`s and surrounding spaces are dropped and the rest lowercased; it
 * must then be 1–{@link MAX_TAG_LENGTH} letters, numbers or `-`.
 */
export function normalizeTag(input: string): string | null {
	const name = input.trim().replace(/^#+/, '').toLocaleLowerCase();
	if (name === '' || [...name].length > MAX_TAG_LENGTH || !TAG_NAME.test(name)) return null;
	return name;
}

/** Why `input` was refused by {@link normalizeTag}, for the reader. */
export function tagError(input: string): string {
	const name = input.trim().replace(/^#+/, '');
	if (name === '') return 'Type a Tag name.';
	if ([...name].length > MAX_TAG_LENGTH) return `Tags can be at most ${MAX_TAG_LENGTH} characters.`;
	return 'Tags can only use letters, numbers and -.';
}
