/**
 * The one module that talks to external book-metadata providers. Everything
 * else in the app depends only on {@link BookSearchResult}; tests stub the
 * `fetch` parameter so no network is touched (ADR-0003).
 *
 * Open Library is queried first; Google Books is consulted only when Open
 * Library has no match. Metadata found here is copied into our own store when a
 * Book is added — it is never fetched live on display (ADR-0003).
 */

/** Which provider a result came from. */
export type BookSource = 'open-library' | 'google-books';

/** A single match from a provider, normalised across Open Library and Google Books. */
export interface BookSearchResult {
	source: BookSource;
	/** Open Library work ID (e.g. `/works/OL45883W`); null for Google Books. */
	workId: string | null;
	title: string;
	/** Author names, in order; may be empty. */
	authors: string[];
	firstPublishYear: number | null;
	/** Absolute URL of a cover image to download, or null when none is offered. */
	coverUrl: string | null;
	/** A representative ISBN for the Edition, or null. */
	isbn: string | null;
	pageCount: number | null;
	description: string;
}

/** The subset of the global `fetch` this module uses; injectable for tests. */
export type FetchLike = (input: string) => Promise<Response>;

const OPEN_LIBRARY_FIELDS =
	'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median';

/**
 * Search for Books by title, author, or ISBN. Open Library is queried first and
 * Google Books is used only as a fallback when Open Library returns nothing. A
 * blank query searches nothing and returns an empty list.
 */
export async function searchBooks(
	query: string,
	fetchImpl: FetchLike = fetch
): Promise<BookSearchResult[]> {
	const q = query.trim();
	if (q === '') return [];

	const fromOpenLibrary = await searchOpenLibrary(q, fetchImpl);
	if (fromOpenLibrary.length > 0) return fromOpenLibrary;

	return searchGoogleBooks(q, fetchImpl);
}

async function searchOpenLibrary(q: string, fetchImpl: FetchLike): Promise<BookSearchResult[]> {
	const url =
		'https://openlibrary.org/search.json?limit=20' +
		`&fields=${OPEN_LIBRARY_FIELDS}` +
		`&q=${encodeURIComponent(q)}`;
	const res = await fetchImpl(url);
	if (!res.ok) return [];
	const body = (await res.json()) as { docs?: OpenLibraryDoc[] };
	return (body.docs ?? []).map(mapOpenLibraryDoc);
}

interface OpenLibraryDoc {
	key?: string;
	title?: string;
	author_name?: string[];
	first_publish_year?: number;
	cover_i?: number;
	isbn?: string[];
	number_of_pages_median?: number;
}

function mapOpenLibraryDoc(doc: OpenLibraryDoc): BookSearchResult {
	return {
		source: 'open-library',
		workId: doc.key ?? null,
		title: doc.title ?? '',
		authors: doc.author_name ?? [],
		firstPublishYear: doc.first_publish_year ?? null,
		coverUrl:
			doc.cover_i != null ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
		isbn: doc.isbn?.[0] ?? null,
		pageCount: doc.number_of_pages_median ?? null,
		description: ''
	};
}

/** Whether a string is an Open Library work ID such as `/works/OL45883W`. */
export function isOpenLibraryWorkId(workId: string): boolean {
	return /^\/works\/OL\d+W$/.test(workId);
}

/**
 * The description of an Open Library work, which search results don't carry.
 * Best-effort: returns '' for an invalid work ID, a failed request, or a work
 * with no description.
 */
export async function fetchOpenLibraryDescription(
	workId: string,
	fetchImpl: FetchLike = fetch
): Promise<string> {
	if (!isOpenLibraryWorkId(workId)) return '';
	try {
		const res = await fetchImpl(`https://openlibrary.org${workId}.json`);
		if (!res.ok) return '';
		const body = (await res.json()) as { description?: string | { value?: string } };
		const d = body.description;
		return (typeof d === 'string' ? d : (d?.value ?? '')).trim();
	} catch {
		return '';
	}
}

/** A cover offered by one of a work's editions, for the cover picker. */
export interface EditionCover {
	/** Absolute URL on the Open Library cover host. */
	coverUrl: string;
	/** The edition's title, to label the choice. */
	label: string;
}

/**
 * The covers of a work's editions, so the reader can pick a real edition cover
 * when the work-level cover is wrong (e.g. a title-page scan). Best-effort:
 * returns [] for an invalid work ID or a failed request. Covers are deduped by
 * id and point at the Open Library cover host, so {@link trustedCoverUrl}
 * accepts them.
 */
export async function fetchWorkEditionCovers(
	workId: string,
	fetchImpl: FetchLike = fetch
): Promise<EditionCover[]> {
	if (!isOpenLibraryWorkId(workId)) return [];
	try {
		const res = await fetchImpl(`https://openlibrary.org${workId}/editions.json?limit=100`);
		if (!res.ok) return [];
		const body = (await res.json()) as { entries?: OpenLibraryEdition[] };
		const seen = new Set<number>();
		const covers: EditionCover[] = [];
		for (const entry of body.entries ?? []) {
			for (const id of entry.covers ?? []) {
				if (id <= 0 || seen.has(id)) continue;
				seen.add(id);
				covers.push({
					coverUrl: `https://covers.openlibrary.org/b/id/${id}-L.jpg`,
					label: entry.title ?? 'Untitled edition'
				});
			}
		}
		return covers;
	} catch {
		return [];
	}
}

interface OpenLibraryEdition {
	title?: string;
	covers?: number[];
}

async function searchGoogleBooks(q: string, fetchImpl: FetchLike): Promise<BookSearchResult[]> {
	const url =
		'https://www.googleapis.com/books/v1/volumes?maxResults=20' +
		`&q=${encodeURIComponent(q)}`;
	const res = await fetchImpl(url);
	if (!res.ok) return [];
	const body = (await res.json()) as { items?: GoogleVolume[] };
	return (body.items ?? []).map(mapGoogleVolume);
}

interface GoogleVolume {
	volumeInfo?: {
		title?: string;
		authors?: string[];
		publishedDate?: string;
		pageCount?: number;
		description?: string;
		imageLinks?: { thumbnail?: string; smallThumbnail?: string };
		industryIdentifiers?: { type?: string; identifier?: string }[];
	};
}

function mapGoogleVolume(volume: GoogleVolume): BookSearchResult {
	const info = volume.volumeInfo ?? {};
	return {
		source: 'google-books',
		workId: null,
		title: info.title ?? '',
		authors: info.authors ?? [],
		firstPublishYear: yearFrom(info.publishedDate),
		coverUrl: info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null,
		isbn: bestIsbn(info.industryIdentifiers),
		pageCount: info.pageCount ?? null,
		description: info.description ?? ''
	};
}

/** The leading four-digit year of a Google Books `publishedDate`, or null. */
function yearFrom(publishedDate: string | undefined): number | null {
	const match = publishedDate?.match(/^(\d{4})/);
	return match ? Number(match[1]) : null;
}

/** Prefer an ISBN-13, then an ISBN-10, else nothing. */
function bestIsbn(ids: { type?: string; identifier?: string }[] | undefined): string | null {
	if (!ids) return null;
	const thirteen = ids.find((i) => i.type === 'ISBN_13')?.identifier;
	const ten = ids.find((i) => i.type === 'ISBN_10')?.identifier;
	return thirteen ?? ten ?? null;
}
