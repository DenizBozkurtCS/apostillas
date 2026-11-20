import { describe, it, expect, vi } from 'vitest';
import { searchBooks, type BookSearchResult } from './booksearch';

/** Build a stub `fetch` that returns canned JSON per host and records calls. */
function stubFetch(byHost: Record<string, unknown>) {
	const calls: string[] = [];
	const fetchImpl = vi.fn(async (input: string | URL | Request) => {
		const url = typeof input === 'string' ? input : input.toString();
		calls.push(url);
		const host = new URL(url).host;
		const body = byHost[host];
		if (body === undefined) throw new Error(`unexpected host ${host}`);
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
	});
	return { fetchImpl, calls };
}

const OPEN_LIBRARY = 'openlibrary.org';
const GOOGLE = 'www.googleapis.com';

describe('searchBooks', () => {
	it('parses Open Library results into BookSearchResult', async () => {
		const { fetchImpl, calls } = stubFetch({
			[OPEN_LIBRARY]: {
				docs: [
					{
						key: '/works/OL45883W',
						title: 'Dune',
						author_name: ['Frank Herbert'],
						first_publish_year: 1965,
						cover_i: 8511741,
						isbn: ['0441013597', '9780441013593'],
						number_of_pages_median: 412
					}
				]
			}
		});

		const results = await searchBooks('dune', fetchImpl);

		expect(results).toHaveLength(1);
		const r: BookSearchResult = results[0];
		expect(r).toMatchObject({
			source: 'open-library',
			workId: '/works/OL45883W',
			title: 'Dune',
			authors: ['Frank Herbert'],
			firstPublishYear: 1965,
			isbn: '0441013597',
			pageCount: 412
		});
		expect(r.coverUrl).toContain('8511741');
		// Google Books is never queried when Open Library has matches.
		expect(calls.some((u) => u.includes(GOOGLE))).toBe(false);
	});

	it('falls back to Google Books only when Open Library returns nothing', async () => {
		const { fetchImpl, calls } = stubFetch({
			[OPEN_LIBRARY]: { docs: [] },
			[GOOGLE]: {
				items: [
					{
						volumeInfo: {
							title: 'An Obscure Zine',
							authors: ['Jane Doe'],
							publishedDate: '2019-05',
							pageCount: 48,
							description: 'A tiny book.',
							imageLinks: { thumbnail: 'http://books.google.com/cover.jpg' },
							industryIdentifiers: [{ type: 'ISBN_13', identifier: '9781234567897' }]
						}
					}
				]
			}
		});

		const results = await searchBooks('an obscure zine', fetchImpl);

		// Open Library is queried first, then Google Books as a fallback.
		expect(calls[0]).toContain(OPEN_LIBRARY);
		expect(calls.some((u) => u.includes(GOOGLE))).toBe(true);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			source: 'google-books',
			workId: null,
			title: 'An Obscure Zine',
			authors: ['Jane Doe'],
			firstPublishYear: 2019,
			isbn: '9781234567897',
			pageCount: 48,
			description: 'A tiny book.'
		});
		expect(results[0].coverUrl).toBe('http://books.google.com/cover.jpg');
	});

	it('returns an empty list when neither source has a match', async () => {
		const { fetchImpl } = stubFetch({
			[OPEN_LIBRARY]: { docs: [] },
			[GOOGLE]: { items: [] }
		});
		expect(await searchBooks('zxqw no such book', fetchImpl)).toEqual([]);
	});

	it('does not search when the query is blank', async () => {
		const fetchImpl = vi.fn();
		expect(await searchBooks('   ', fetchImpl)).toEqual([]);
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
