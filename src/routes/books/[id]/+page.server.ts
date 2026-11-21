import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { coversDir } from '#lib/server/paths';
import { fetchWorkEditionCovers } from '#lib/server/booksearch';
import { checkCover, MAX_COVER_BYTES } from '#lib/server/covers';
import {
	deleteBook,
	loadBookDetail,
	rateBook,
	setBookCoverFromBytes,
	setBookCoverFromUrl,
	setStatus,
	syncBookMetadata,
	todayISO,
	updateBookMetadata,
	type BookDetail
} from '#lib/server/book';
import { parseStatusKey } from '#lib/domain/reading';
import {
	addImpression,
	deleteImpression,
	editImpression,
	impressionFromForm,
	loadImpressions
} from '#lib/server/impressions';
import {
	addNote,
	addQuote,
	deleteNote,
	deleteQuote,
	editNote,
	editQuote,
	loadAnnotations
} from '#lib/server/annotations';
import { tagError } from '#lib/domain/tags';
import { addTag, allTags, removeTag, tagsForBook } from '#lib/server/tags';
import { addBookToShelf, createShelf, removeBookFromShelf, shelvesForBook } from '#lib/server/shelves';
import type { Actions, PageServerLoad } from './$types';

function parseId(raw: string): number {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Not found');
	return id;
}

/** Load a Book or 404; shared by the loader and every action. */
function requireBook(id: number): BookDetail {
	const detail = loadBookDetail(db, id);
	if (!detail) error(404, 'Not found');
	return detail;
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

const MAX_COVER_MB = MAX_COVER_BYTES / (1024 * 1024);

export const load: PageServerLoad = async ({ params, url }) => {
	const id = parseId(params.id);
	const { book, quoteCount, noteCount } = requireBook(id);

	// Edition covers are fetched over the network only when the reader opens the
	// cover picker (`?covers=1`) on a Book that has an Open Library work ID.
	const editionCovers =
		url.searchParams.get('covers') === '1' && book.workId
			? await fetchWorkEditionCovers(book.workId)
			: null;

	const annotations = loadAnnotations(db, id);

	return {
		book,
		quoteCount,
		noteCount,
		editionCovers,
		quotes: annotations.quotes,
		notes: annotations.notes,
		impressions: loadImpressions(db, id),
		// Default date of a new Impression.
		today: todayISO(),
		tags: tagsForBook(db, id),
		// Every Tag in use, for the "+ tag" suggestions.
		allTags: allTags(db),
		// For "Add to Shelf…": every Shelf, and whether this Book is on it.
		shelves: shelvesForBook(db, id)
	};
};

export const actions: Actions = {
	/** Switch one Reading Status on (`on` = 1) or off; the others stay (ADR-0006). */
	setStatus: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const key = parseStatusKey(form.get('status'));
		if (key === null) return fail(400, { error: 'Unknown status.' });
		setStatus(db, id, key, form.get('on') === '1');
	},

	/** Rate the Book from its stars (also switches Read it on), or clear the rating. */
	rate: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const rating = form.get('clear') != null ? null : optionalNumber(form.get('rating'));
		if (!rateBook(db, id, rating)) {
			return fail(400, { error: 'Rating must be from ½ to 5 stars, in half-star steps.' });
		}
	},

	addImpression: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const check = impressionFromForm(await request.formData());
		if (!check.ok) return fail(400, { impressionError: check.error, impressionId: null });
		addImpression(db, id, check.input);
	},

	editImpression: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const impressionId = optionalNumber(form.get('impressionId'));
		const check = impressionFromForm(form);
		if (!check.ok) return fail(400, { impressionError: check.error, impressionId });
		if (impressionId === null || !editImpression(db, id, impressionId, check.input)) {
			return fail(400, { impressionError: 'That Impression no longer exists.', impressionId: null });
		}
	},

	deleteImpression: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const impressionId = optionalNumber((await request.formData()).get('impressionId'));
		if (impressionId !== null) deleteImpression(db, id, impressionId);
	},

	updateMeta: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const title = optional(form.get('title'));
		if (title === null) return fail(400, { metaError: 'A title is required.' });

		const authors = (optional(form.get('authors')) ?? '')
			.split(',')
			.map((a) => a.trim())
			.filter((a) => a !== '');

		updateBookMetadata(db, id, {
			title,
			authors,
			description: optional(form.get('description')) ?? '',
			isbn: optional(form.get('isbn')),
			pageCount: optionalNumber(form.get('pageCount'))
		});
	},

	uploadCover: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const cover = form.get('cover');
		if (!(cover instanceof File) || cover.size === 0) {
			return fail(400, { coverError: 'Choose an image to upload.' });
		}
		if (cover.size > MAX_COVER_BYTES) {
			return fail(400, { coverError: `The cover must be ${MAX_COVER_MB} MB or smaller.` });
		}
		const bytes = new Uint8Array(await cover.arrayBuffer());
		if (!checkCover(bytes).ok) {
			return fail(400, { coverError: 'The cover must be a JPEG, PNG, GIF or WebP image.' });
		}
		if (!setBookCoverFromBytes(db, coversDir(), id, bytes)) {
			return fail(400, { coverError: 'The cover must be a JPEG, PNG, GIF or WebP image.' });
		}
	},

	/** Re-copy title, authors, description, ISBN and page count from Open Library. */
	syncMeta: async ({ params }) => {
		const id = parseId(params.id);
		requireBook(id);
		const result = await syncBookMetadata(db, id);
		if (result === 'no-source') {
			return fail(400, { syncError: 'This book was not added from Open Library, so there is nothing to sync from.' });
		}
		if (result === 'unavailable') {
			return fail(502, { syncError: 'Open Library could not be reached. Try again later.' });
		}
	},

	pickCover: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const coverUrl = optional(form.get('coverUrl'));
		if (!coverUrl) return fail(400, { coverError: 'Pick a cover first.' });
		if (!(await setBookCoverFromUrl(db, coversDir(), id, coverUrl))) {
			return fail(400, { coverError: 'That cover could not be used.' });
		}
	},

	addQuote: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const text = optional(form.get('text'));
		if (text === null) return fail(400, { quoteError: 'A Quote needs some text.' });
		addQuote(db, id, {
			text,
			location: optional(form.get('location'))
		});
	},

	editQuote: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const quoteId = optionalNumber(form.get('quoteId'));
		if (quoteId === null) return fail(400, { quoteError: 'That Quote no longer exists.' });
		const text = optional(form.get('text'));
		if (text === null) return fail(400, { quoteError: 'A Quote needs some text.' });
		if (
			!editQuote(db, id, quoteId, {
				text,
				location: optional(form.get('location'))
			})
		) {
			return fail(400, { quoteError: 'That Quote no longer exists.' });
		}
	},

	deleteQuote: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const quoteId = optionalNumber(form.get('quoteId'));
		if (quoteId !== null) deleteQuote(db, id, quoteId);
	},

	addNote: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const body = optional(form.get('body'));
		if (body === null) return fail(400, { noteError: 'A Note needs some text.' });
		addNote(db, id, { body });
	},

	editNote: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const noteId = optionalNumber(form.get('noteId'));
		if (noteId === null) return fail(400, { noteError: 'That Note no longer exists.' });
		const body = optional(form.get('body'));
		if (body === null) return fail(400, { noteError: 'A Note needs some text.' });
		if (!editNote(db, id, noteId, { body })) {
			return fail(400, { noteError: 'That Note no longer exists.' });
		}
	},

	deleteNote: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const noteId = optionalNumber(form.get('noteId'));
		if (noteId !== null) deleteNote(db, id, noteId);
	},

	addTag: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const raw = String((await request.formData()).get('tag') ?? '');
		if (addTag(db, id, raw) === null) return fail(400, { tagError: tagError(raw) });
	},

	removeTag: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		removeTag(db, id, String((await request.formData()).get('tag') ?? ''));
	},

	/** Put the Book on a Shelf (`on` sent) or take it off (`on` absent: an unticked box). */
	setShelf: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const shelfId = optionalNumber(form.get('shelfId'));
		if (shelfId === null) return;
		if (form.get('on') === '1') addBookToShelf(db, shelfId, id);
		else removeBookFromShelf(db, shelfId, id);
	},

	/** Make a Shelf from "Add to Shelf…" and put the Book on it. */
	newShelf: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const res = createShelf(db, String((await request.formData()).get('name') ?? ''));
		if (!res.ok) return fail(400, { shelfError: res.error });
		addBookToShelf(db, res.id, id);
	},

	deleteBook: ({ params }) => {
		const id = parseId(params.id);
		requireBook(id);
		deleteBook(db, coversDir(), id);
		redirect(303, '/reading');
	}
};
