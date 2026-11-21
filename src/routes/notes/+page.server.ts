import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { addNote, addQuote, deleteNote, deleteQuote, editNote, editQuote } from '#lib/server/annotations';
import { annotatableBooks, canAnnotateBook, loadFeed } from '#lib/server/notes';
import type { Actions, PageServerLoad } from './$types';

/**
 * Notes & Quotes (apostillas-v2/02): every Note and Quote, newest first, and
 * the Books a new one can be written about. Every write is scoped to the Book
 * the form names, through ./annotations.
 */
export const load: PageServerLoad = () => {
	const feed = loadFeed(db);
	return { notes: feed.notes, quotes: feed.quotes, books: annotatableBooks(db) };
};

function optional(value: FormDataEntryValue | null): string | null {
	const s = typeof value === 'string' ? value.trim() : '';
	return s === '' ? null : s;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
	const s = optional(value);
	if (s === null) return null;
	const n = Number(s);
	return Number.isInteger(n) ? n : null;
}

export const actions: Actions = {
	addNote: async ({ request }) => {
		const form = await request.formData();
		const bookId = optionalNumber(form.get('bookId'));
		if (bookId === null) return fail(400, { noteError: 'Choose which Book the Note is about.' });
		if (!canAnnotateBook(db, bookId)) {
			return fail(400, { noteError: 'That Book no longer exists.' });
		}
		const body = optional(form.get('body'));
		if (body === null) return fail(400, { noteError: 'A Note needs some text.' });
		addNote(db, bookId, { body });
	},

	addQuote: async ({ request }) => {
		const form = await request.formData();
		const bookId = optionalNumber(form.get('bookId'));
		if (bookId === null) return fail(400, { quoteError: 'Choose which Book the Quote is from.' });
		if (!canAnnotateBook(db, bookId)) {
			return fail(400, { quoteError: 'That Book no longer exists.' });
		}
		const text = optional(form.get('text'));
		if (text === null) return fail(400, { quoteError: 'A Quote needs some text.' });
		addQuote(db, bookId, {
			text,
			location: optional(form.get('location'))
		});
	},

	editNote: async ({ request }) => {
		const form = await request.formData();
		const bookId = optionalNumber(form.get('bookId'));
		const noteId = optionalNumber(form.get('noteId'));
		const body = optional(form.get('body'));
		if (body === null) return fail(400, { noteError: 'A Note needs some text.' });
		if (bookId === null || noteId === null || !editNote(db, bookId, noteId, { body })) {
			return fail(400, { noteError: 'That Note no longer exists.' });
		}
	},

	editQuote: async ({ request }) => {
		const form = await request.formData();
		const bookId = optionalNumber(form.get('bookId'));
		const quoteId = optionalNumber(form.get('quoteId'));
		const text = optional(form.get('text'));
		if (text === null) return fail(400, { quoteError: 'A Quote needs some text.' });
		const input = {
			text,
			location: optional(form.get('location'))
		};
		if (bookId === null || quoteId === null || !editQuote(db, bookId, quoteId, input)) {
			return fail(400, { quoteError: 'That Quote no longer exists.' });
		}
	},

	deleteNote: async ({ request }) => {
		const form = await request.formData();
		const bookId = optionalNumber(form.get('bookId'));
		const noteId = optionalNumber(form.get('noteId'));
		if (bookId !== null && noteId !== null) deleteNote(db, bookId, noteId);
	},

	deleteQuote: async ({ request }) => {
		const form = await request.formData();
		const bookId = optionalNumber(form.get('bookId'));
		const quoteId = optionalNumber(form.get('quoteId'));
		if (bookId !== null && quoteId !== null) deleteQuote(db, bookId, quoteId);
	}
};
