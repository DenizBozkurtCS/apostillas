/**
 * Reading a Book from a Goodreads book page, for adding a Book by pasting its
 * Goodreads link. Goodreads has no public API, so this reads the page itself:
 * the main Book in the page's embedded app data (title without the series,
 * authors, description, cover, ISBN, pages), falling back to the page's
 * schema.org data. Like the search providers, the metadata is copied into our
 * store once, when the Book is added (ADR-0003).
 */

import { searchBooks, type BookSearchResult, type FetchLike } from './booksearch';

/** `fetch` with request options; injectable for tests. */
export type FetchWithInit = (url: string, init?: RequestInit) => Promise<Response>;

/** Why a Goodreads link could not be turned into a Book. */
export class GoodreadsError extends Error {}

/**
 * Goodreads answered, but not with the book page (it sometimes sends automated
 * clients a check page instead). We don't try to get past that; the caller can
 * fall back to {@link findByLinkTitle}.
 */
export class GoodreadsRefused extends GoodreadsError {}

const GOODREADS_HOSTS = new Set(['goodreads.com', 'www.goodreads.com', 'm.goodreads.com']);

/** A book page path, with an optional language prefix: `/book/show/44767458-dune`. */
const BOOK_PATH = /^\/(?:[a-z]{2}\/)?book\/show\/(\d+)([-.][^/]*)?\/?$/i;

/**
 * The canonical URL of the Goodreads book page a link points at, or null when
 * the link isn't one. Only goodreads.com book pages are fetched, never other
 * hosts. The query and fragment are dropped.
 */
export function goodreadsBookUrl(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	if (!GOODREADS_HOSTS.has(url.hostname.toLowerCase()) || url.port !== '' || url.username !== '') {
		return null;
	}
	const match = BOOK_PATH.exec(url.pathname);
	if (!match) return null;
	return `https://www.goodreads.com/book/show/${match[1]}${match[2] ?? ''}`;
}

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
	return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function positiveInt(v: unknown): number | null {
	const n = typeof v === 'string' ? Number(v) : v;
	return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

function scriptJson(html: string, opening: RegExp): unknown[] {
	const found: unknown[] = [];
	const re = new RegExp(opening.source + /([\s\S]*?)<\/script>/.source, 'gi');
	for (const m of html.matchAll(re)) {
		try {
			found.push(JSON.parse(m[1]));
		} catch {
			// Not JSON after all; ignore it.
		}
	}
	return found;
}

/** "Dune (Dune, #1)" → "Dune": drop a trailing series marker. */
export function withoutSeries(title: string): string {
	return title.replace(/\s*\([^()]*#\s*\d+(?:\.\d+)?\)\s*$/, '').trim() || title.trim();
}

/** Collapse runs of spaces in a name ("Ursula K.  Le Guin"). */
function cleanName(name: string): string {
	return name.replace(/\s+/g, ' ').trim();
}

/** Plain text from Goodreads description HTML, keeping paragraph breaks. */
function plainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&nbsp;/g, ' ');
}

function tidyDescription(text: string): string {
	return text
		.replace(/\r\n?/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/** Goodreads' stand-in image for a book with no cover. */
function isPlaceholderCover(url: string): boolean {
	return /nophoto|no-cover|no_cover/i.test(url);
}

/** The page's main Book in its embedded app data, if present. */
function appBook(html: string, legacyId: number | null): { book: Json; state: Json } | null {
	for (const data of scriptJson(html, /<script id="__NEXT_DATA__" type="application\/json">/)) {
		const state = isObject(data) && isObject(data.props) && isObject(data.props.pageProps)
			? data.props.pageProps.apolloState
			: null;
		if (!isObject(state)) continue;
		const books = Object.values(state).filter(
			(v): v is Json => isObject(v) && v.__typename === 'Book' && typeof v.title === 'string'
		);
		const book = books.find((b) => legacyId !== null && b.legacyId === legacyId) ?? books[0];
		if (book) return { book, state };
	}
	return null;
}

/** Names of the Book's contributors whose role is Author, in page order. */
function appAuthors(book: Json, state: Json): string[] {
	const edges = [book.primaryContributorEdge, ...(Array.isArray(book.secondaryContributorEdges) ? book.secondaryContributorEdges : [])];
	const names: string[] = [];
	for (const edge of edges) {
		if (!isObject(edge) || !isObject(edge.node)) continue;
		if (edge.role !== undefined && edge.role !== 'Author') continue;
		const ref = edge.node.__ref;
		const person = typeof ref === 'string' ? state[ref] : edge.node;
		const name = isObject(person) ? str(person.name) : null;
		if (name) names.push(cleanName(name));
	}
	return names;
}

/** The page's schema.org Book, if present. */
function linkedDataBook(html: string): Json | null {
	for (const data of scriptJson(html, /<script type="application\/ld\+json">/)) {
		for (const item of Array.isArray(data) ? data : [data]) {
			if (isObject(item) && item['@type'] === 'Book') return item;
		}
	}
	return null;
}

function linkedDataAuthors(ld: Json): string[] {
	const raw = Array.isArray(ld.author) ? ld.author : [ld.author];
	return raw.flatMap((a) => {
		const name = isObject(a) ? str(a.name) : str(a);
		return name ? [cleanName(name)] : [];
	});
}

/**
 * The Book a Goodreads book page describes, as a search result ready to add.
 * Throws {@link GoodreadsError} when the page carries no book data (Goodreads
 * sometimes answers bots with a challenge page instead).
 */
export function parseGoodreadsPage(html: string, url: string | null = null): BookSearchResult {
	const idMatch = url ? /\/book\/show\/(\d+)/.exec(url) : null;
	const legacyId = idMatch ? Number(idMatch[1]) : null;
	const app = appBook(html, legacyId);
	const ld = linkedDataBook(html);
	if (!app && !ld) throw new GoodreadsRefused('That Goodreads page has no book details.');

	const book = app?.book ?? {};
	const details = isObject(book.details) ? book.details : {};

	const title =
		str(book.title) ?? (str(book.titleComplete) ? withoutSeries(str(book.titleComplete)!) : null) ??
		(ld && str(ld.name) ? withoutSeries(str(ld.name)!) : null);
	if (!title) throw new GoodreadsError('That Goodreads page has no book title.');

	const fromApp = app ? appAuthors(app.book, app.state) : [];
	const authors = fromApp.length > 0 ? fromApp : ld ? linkedDataAuthors(ld) : [];

	const stripped = str(book['description({"stripped":true})']);
	const rich = str(book.description);
	const description = tidyDescription(stripped ?? (rich ? plainText(rich) : ''));

	const image = str(book.imageUrl) ?? (ld ? str(ld.image) : null);
	const coverUrl = image && !isPlaceholderCover(image) ? image : null;

	return {
		source: 'goodreads',
		workId: null,
		title: cleanName(title),
		authors,
		firstPublishYear: null,
		coverUrl,
		isbn: str(details.isbn13) ?? (ld ? str(ld.isbn) : null) ?? str(details.isbn),
		pageCount: positiveInt(details.numPages) ?? (ld ? positiveInt(ld.numberOfPages) : null),
		description
	};
}

const FETCH_TIMEOUT_MS = 12_000;

/**
 * Fetch a Goodreads book page and read the Book from it. `link` must already be
 * a canonical book URL from {@link goodreadsBookUrl}.
 */
export async function fetchGoodreadsBook(
	link: string,
	fetchImpl: FetchWithInit = fetch
): Promise<BookSearchResult> {
	let res: Response;
	try {
		res = await fetchImpl(link, {
			headers: {
				// Goodreads serves the full page to browsers; a bare client may get a challenge.
				'user-agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
				'accept-language': 'en'
			},
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		});
	} catch {
		throw new GoodreadsError('Goodreads didn’t answer. Try again in a moment.');
	}
	if (res.status === 404) throw new GoodreadsError('Goodreads has no book at that link.');
	if (res.status !== 200) {
		throw new GoodreadsRefused('Goodreads didn’t send the book page. Try again in a moment.');
	}
	return parseGoodreadsPage(await res.text(), res.url || link);
}

/**
 * The title a book link spells out in its last part: `5129.Brave_New_World` →
 * "Brave New World", `44767458-dune` → "dune". Null when the link has only the id.
 */
export function titleFromLink(link: string): string | null {
	const match = /\/book\/show\/\d+[-.]([^/?#]+)/.exec(link);
	if (!match) return null;
	let slug: string;
	try {
		slug = decodeURIComponent(match[1]);
	} catch {
		slug = match[1];
	}
	const title = slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
	return title === '' ? null : title;
}

const loose = (s: string) =>
	s
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

/**
 * When Goodreads won't send the page: search the book providers for the title
 * the link spells out, and take the result whose title matches it (or else the
 * first). Null when the link has no title or nothing is found. May throw
 * BookSearchUnavailable.
 */
export async function findByLinkTitle(
	link: string,
	fetchImpl: FetchLike = fetch
): Promise<BookSearchResult | null> {
	const title = titleFromLink(link);
	if (title === null) return null;
	const results = await searchBooks(title, fetchImpl);
	const wanted = loose(title);
	return results.find((r) => loose(withoutSeries(r.title)) === wanted) ?? results[0] ?? null;
}
