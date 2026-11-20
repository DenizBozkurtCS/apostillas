import path from 'node:path';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { dataDir } from '#lib/server/paths';
import { searchBooks, type BookSearchResult } from '#lib/server/booksearch';
import { addBook, addBookManually } from '#lib/server/books';
import type { Actions, PageServerLoad } from './$types';

/** Run the search when `?q=` is present so the page is bookmarkable. */
export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const results = q ? await searchBooks(q) : [];
	return { q, results, searched: q !== '' };
};

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

/** Reconstruct the picked result from the hidden fields the form carries. */
function resultFromForm(form: FormData): BookSearchResult {
	let authors: string[] = [];
	try {
		const parsed = JSON.parse((form.get('authors') as string) || '[]');
		if (Array.isArray(parsed)) authors = parsed.filter((a): a is string => typeof a === 'string');
	} catch {
		authors = [];
	}
	const source = form.get('source') === 'google-books' ? 'google-books' : 'open-library';
	return {
		source,
		workId: optional(form.get('workId')),
		title: (optional(form.get('title')) ?? '').toString(),
		authors,
		firstPublishYear: optionalNumber(form.get('firstPublishYear')),
		coverUrl: optional(form.get('coverUrl')),
		isbn: optional(form.get('isbn')),
		pageCount: optionalNumber(form.get('pageCount')),
		description: optional(form.get('description')) ?? ''
	};
}

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const result = resultFromForm(form);
		if (result.title === '') return fail(400, { error: 'This result has no title.' });

		const { bookId } = await addBook(
			{ db, coversDir: path.join(dataDir(), 'covers') },
			{ result, whyRecommended: optional(form.get('whyRecommended')) }
		);
		// Open the Book (existing or just created) rather than a duplicate.
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
			coverBytes = new Uint8Array(await cover.arrayBuffer());
		}

		const { bookId } = addBookManually(
			{ db, coversDir: path.join(dataDir(), 'covers') },
			{
				title,
				authors,
				isbn: optional(form.get('isbn')),
				pageCount: optionalNumber(form.get('pageCount')),
				description: optional(form.get('description')),
				whyRecommended: optional(form.get('whyRecommended')),
				cover: coverBytes
			}
		);
		// Open the Book (existing or just created) rather than a duplicate.
		redirect(303, `/books/${bookId}`);
	}
};
