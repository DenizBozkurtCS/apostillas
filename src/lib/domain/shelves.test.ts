import { describe, it, expect } from 'vitest';
import { MAX_SHELF_NAME, checkShelfName, shelfSlug } from './shelves';

describe('shelfSlug', () => {
	it('lowercases, joins words with - and drops punctuation', () => {
		expect(shelfSlug('Summer 2027!')).toBe('summer-2027');
		expect(shelfSlug('  Gifts for   Dad ')).toBe('gifts-for-dad');
		expect(shelfSlug('Sci-Fi / Fantasy')).toBe('sci-fi-fantasy');
		expect(shelfSlug('to_read -- later')).toBe('to-read-later');
	});

	it('keeps letters beyond ASCII', () => {
		expect(shelfSlug('Türkçe Kitaplar')).toBe('türkçe-kitaplar');
	});

	it('gives the same slug to names that differ only in case or punctuation', () => {
		expect(shelfSlug('Gifts!')).toBe(shelfSlug('gifts?'));
	});

	it('is empty for a name with no letters or numbers', () => {
		expect(shelfSlug('★★★')).toBe('');
	});
});

describe('checkShelfName', () => {
	it('tidies spaces and returns the slug', () => {
		expect(checkShelfName('  Summer   2027 ')).toEqual({ ok: true, name: 'Summer 2027', slug: 'summer-2027' });
	});

	it('refuses empty, symbol-only and overlong names', () => {
		expect(checkShelfName('   ')).toMatchObject({ ok: false, error: 'Give the Shelf a name.' });
		expect(checkShelfName('★★★')).toMatchObject({ ok: false, error: expect.stringMatching(/letter or number/) });
		expect(checkShelfName('x'.repeat(MAX_SHELF_NAME + 1))).toMatchObject({ ok: false });
		expect(checkShelfName('x'.repeat(MAX_SHELF_NAME))).toMatchObject({ ok: true });
	});
});
