import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { coversDir } from '#lib/server/paths';
import { searchBooks, withDescriptions, type BookSearchResult } from '#lib/server/booksearch';
import { addBook, addBookManually, findExistingBook, parseAuthors, type AddBookDeps } from '#lib/server/books';
import { searchLibrary } from '#lib/server/lists';
import { checkCover, MAX_COVER_BYTES } from '#lib/server/covers';
import { parseAddChoice, setInitialStatus } from '#lib/server/book';
import type { Actions, PageServerLoad } from './$types';

/**
 * Run the search when `?q=` is present so the page is bookmarkable. Books
 * already in the library that match come first; a provider result that is one
 * of them is left out, and one that is in the library but didn't match the
 * words (e.g. found by ISBN) carries `existingId` so its cover just opens it.
 */
export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q === '') return { q, searched: false, library: [], results: [] };

	const library = searchLibrary(db, q).map((b) => ({
		id: b.id,
		title: b.title,
		authors: b.authors,
		coverPath: b.coverPath,
		description: b.description
	}));
	const shown = new Set(library.map((b) => b.id));
	const results = (await withDescriptions(await searchBooks(q)))
		.map((r) => ({ ...r, existingId: findExistingBook(db, r) }))
		.filter((r) => r.existingId === null || !shown.has(r.existingId));
	return { q, searched: true, library, results };
};

function addDeps(): AddBookDeps {
	return { db, coversDir: coversDir() };
}

function optional(value: FormDataEntryValue | null): string | null {
	const s = typeof value === 'string' ? value.trim() : '';
	return s === '' ? null : s;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
	const s = optional(value);
	if (s === null) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

/**
 * Reconstruct the picked result from the hidden fields the form carries. These
 * come from the browser, so `addBook` re-checks the work ID and only downloads
 * covers from the providers' cover hosts.
 */
function resultFromForm(form: FormData): BookSearchResult {
	const source = form.get('source') === 'google-books' ? 'google-books' : 'open-library';
	return {
		source,
		workId: optional(form.get('workId')),
		title: optional(form.get('title')) ?? '',
		authors: parseAuthors(optional(form.get('authors')) ?? '[]'),
		firstPublishYear: optionalNumber(form.get('firstPublishYear')),
		coverUrl: optional(form.get('coverUrl')),
		isbn: optional(form.get('isbn')),
		pageCount: optionalNumber(form.get('pageCount')),
		description: optional(form.get('description')) ?? ''
	};
}

const MAX_COVER_MB = MAX_COVER_BYTES / (1024 * 1024);

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const result = resultFromForm(form);
		if (result.title === '') return fail(400, { error: 'This result has no title.' });

		// Clicking a result's cover adds it with no Reading Status; the reader sets
		// one on the Book page. An existing Book is just opened.
		const { bookId } = await addBook(addDeps(), { result });
		redirect(303, `/books/${bookId}`);
	},

	/** Add a Book the reader typed in by hand (ADR-0003). */
	manual: async ({ request }) => {
		const form = await request.formData();

		const title = optional(form.get('title'));
		if (title === null) return fail(400, { manual: { error: 'A title is required.' } });

		const authors = (optional(form.get('authors')) ?? '')
			.split(',')
			.map((a) => a.trim())
			.filter((a) => a !== '');

		const cover = form.get('cover');
		let coverBytes: Uint8Array | null = null;
		if (cover instanceof File && cover.size > 0) {
			if (cover.size > MAX_COVER_BYTES) {
				return fail(400, { manual: { error: `The cover must be ${MAX_COVER_MB} MB or smaller.` } });
			}
			coverBytes = new Uint8Array(await cover.arrayBuffer());
			if (!checkCover(coverBytes).ok) {
				return fail(400, { manual: { error: 'The cover must be a JPEG, PNG, GIF or WebP image.' } });
			}
		}

		const { bookId, created } = addBookManually(addDeps(), {
			title,
			authors,
			isbn: optional(form.get('isbn')),
			pageCount: optionalNumber(form.get('pageCount')),
			description: optional(form.get('description')),
			cover: coverBytes
		});
		if (created) {
			setInitialStatus(db, bookId, parseAddChoice(form));
		}
		// Open the Book (existing or just created) rather than a duplicate.
		redirect(303, `/books/${bookId}`);
	}
};
