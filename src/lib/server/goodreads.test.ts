import { describe, expect, it } from 'vitest';
import {
	fetchGoodreadsBook,
	findByLinkTitle,
	GoodreadsError,
	GoodreadsRefused,
	titleFromLink,
	goodreadsBookUrl,
	parseGoodreadsPage,
	withoutSeries,
	type FetchWithInit
} from './goodreads';

const COVER = 'https://m.media-amazon.com/images/S/x/books/1i/44767458.jpg';

/** A Goodreads book page trimmed to the parts the parser reads, shaped like the real one. */
function page({ app = true, ld = true, image = COVER } = {}): string {
	const state = {
		'Contributor:a1': { __typename: 'Contributor', name: 'Frank  Herbert' },
		'Contributor:a2': { __typename: 'Contributor', name: 'Someone Translator' },
		'Book:other': { __typename: 'Book', title: 'Children of Dune', legacyId: 1 },
		'Book:main': {
			__typename: 'Book',
			legacyId: 44767458,
			title: 'Dune',
			titleComplete: 'Dune (Dune, #1)',
			description: 'Set on <i>Arrakis</i>.<br /><br />Paul’s story.',
			'description({"stripped":true})': 'Set on Arrakis.\r\n\r\nPaul’s story.',
			imageUrl: image,
			primaryContributorEdge: { node: { __ref: 'Contributor:a1' }, role: 'Author' },
			secondaryContributorEdges: [{ node: { __ref: 'Contributor:a2' }, role: 'Translator' }],
			details: { numPages: 658, isbn: '059309932X', isbn13: '9780593099322' }
		}
	};
	const next = { props: { pageProps: { apolloState: state } } };
	const linked = {
		'@context': 'https://schema.org',
		'@type': 'Book',
		name: 'Dune (Dune, #1)',
		image,
		numberOfPages: 658,
		isbn: '9780593099322',
		author: [{ '@type': 'Person', name: 'Frank Herbert' }]
	};
	const head = ld ? `<script type="application/ld+json">${JSON.stringify(linked)}</script>` : '';
	const body = app
		? `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(next)}</script>`
		: '';
	return `<html><head>${head}</head><body>${body}</body></html>`;
}

const LINK = 'https://www.goodreads.com/book/show/44767458-dune';

describe('goodreadsBookUrl', () => {
	it('accepts book page links in their usual shapes and drops the query', () => {
		expect(goodreadsBookUrl(LINK)).toBe(LINK);
		expect(goodreadsBookUrl(` ${LINK}?from_search=true#x `)).toBe(LINK);
		expect(goodreadsBookUrl('http://m.goodreads.com/en/book/show/44767458-dune')).toBe(LINK);
		expect(goodreadsBookUrl('https://goodreads.com/book/show/44767458.Dune')).toBe(
			'https://www.goodreads.com/book/show/44767458.Dune'
		);
		expect(goodreadsBookUrl('https://www.goodreads.com/book/show/44767458')).toBe(
			'https://www.goodreads.com/book/show/44767458'
		);
	});

	it('refuses other pages and other hosts', () => {
		for (const raw of [
			'',
			'dune',
			'https://www.goodreads.com/author/show/58.Frank_Herbert',
			'https://www.goodreads.com/book/show/dune',
			'https://www.goodreads.com.evil.example/book/show/1-x',
			'https://evil.example/book/show/1-x',
			'https://www.goodreads.com:8080/book/show/1-x',
			'ftp://www.goodreads.com/book/show/1-x'
		]) {
			expect(goodreadsBookUrl(raw), raw).toBeNull();
		}
	});
});

describe('parseGoodreadsPage', () => {
	it('reads the main Book: title without the series, authors only, plain description', () => {
		expect(parseGoodreadsPage(page(), LINK)).toEqual({
			source: 'goodreads',
			workId: null,
			title: 'Dune',
			authors: ['Frank Herbert'],
			firstPublishYear: null,
			coverUrl: COVER,
			isbn: '9780593099322',
			pageCount: 658,
			description: 'Set on Arrakis.\n\nPaul’s story.'
		});
	});

	it('falls back to the schema.org data', () => {
		const book = parseGoodreadsPage(page({ app: false }), LINK);
		expect(book.title).toBe('Dune');
		expect(book.authors).toEqual(['Frank Herbert']);
		expect(book.pageCount).toBe(658);
		expect(book.isbn).toBe('9780593099322');
		expect(book.description).toBe('');
	});

	it('leaves out the Goodreads no-cover image', () => {
		const nophoto = 'https://s.gr-assets.com/assets/nophoto/book/111x148.png';
		expect(parseGoodreadsPage(page({ image: nophoto })).coverUrl).toBeNull();
	});

	it('throws when the page has no book data', () => {
		expect(() => parseGoodreadsPage('<html>Are you a robot?</html>')).toThrow(GoodreadsRefused);
	});
});

describe('withoutSeries', () => {
	it('drops a trailing series marker only', () => {
		expect(withoutSeries('Dune (Dune, #1)')).toBe('Dune');
		expect(withoutSeries('The Way of Kings (The Stormlight Archive, #1.5)')).toBe('The Way of Kings');
		expect(withoutSeries('Persuasion (Penguin Classics)')).toBe('Persuasion (Penguin Classics)');
	});
});

describe('fetchGoodreadsBook', () => {
	const respond =
		(body: string, status = 200): FetchWithInit =>
		async () =>
			new Response(body, { status });

	it('fetches the page and reads the Book', async () => {
		const asked: string[] = [];
		const fetchImpl: FetchWithInit = async (url) => {
			asked.push(url);
			return new Response(page(), { status: 200 });
		};
		expect((await fetchGoodreadsBook(LINK, fetchImpl)).title).toBe('Dune');
		expect(asked).toEqual([LINK]);
	});

	it('explains a missing book, a refusal and no answer', async () => {
		await expect(fetchGoodreadsBook(LINK, respond('', 404))).rejects.toThrow(/no book at that link/);
		await expect(fetchGoodreadsBook(LINK, respond('', 202))).rejects.toThrow(GoodreadsRefused);
		await expect(fetchGoodreadsBook(LINK, respond('', 404))).rejects.not.toThrow(GoodreadsRefused);
		const down: FetchWithInit = async () => {
			throw new TypeError('fetch failed');
		};
		await expect(fetchGoodreadsBook(LINK, down)).rejects.toThrow(/answer/);
	});
});

describe('titleFromLink', () => {
	it('spells the title out of the link', () => {
		expect(titleFromLink('https://www.goodreads.com/book/show/5129.Brave_New_World')).toBe('Brave New World');
		expect(titleFromLink(LINK)).toBe('dune');
		expect(titleFromLink('https://www.goodreads.com/book/show/1-cien-a%C3%B1os')).toBe('cien años');
		expect(titleFromLink('https://www.goodreads.com/book/show/5129')).toBeNull();
	});
});

describe('findByLinkTitle', () => {
	const openLibrary =
		(docs: { title: string; key: string }[]): FetchWithInit =>
		async () =>
			new Response(JSON.stringify({ docs: docs.map((d) => ({ ...d, author_name: ['A. Huxley'] })) }));

	it('takes the search result whose title matches the link', async () => {
		const found = await findByLinkTitle(
			'https://www.goodreads.com/book/show/5129.Brave_New_World',
			openLibrary([
				{ title: 'Brave New World Revisited', key: '/works/OL1W' },
				{ title: 'Brave New World', key: '/works/OL2W' }
			])
		);
		expect(found).toMatchObject({ title: 'Brave New World', workId: '/works/OL2W' });
	});

	it('takes the first result when none matches exactly, and nothing without a title', async () => {
		const fetchImpl = openLibrary([{ title: 'Brave New World Revisited', key: '/works/OL1W' }]);
		expect((await findByLinkTitle('https://www.goodreads.com/book/show/5129.Brave_New_World', fetchImpl))?.title).toBe(
			'Brave New World Revisited'
		);
		expect(await findByLinkTitle('https://www.goodreads.com/book/show/5129', fetchImpl)).toBeNull();
	});
});
