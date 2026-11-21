import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { loadLibrary } from '#lib/server/lists';
import {
	addBookToShelf,
	arrangeShelf,
	deleteShelf,
	loadShelf,
	removeBookFromShelf,
	renameShelf,
	setShelfDescription
} from '#lib/server/shelves';
import type { Actions, PageServerLoad } from './$types';

function slugOf(params: { slug: string }): string {
	return params.slug.normalize('NFC').toLocaleLowerCase();
}

/** The Shelf on screen, or a 404 (an old address after a rename lands here). */
function requireShelf(params: { slug: string }) {
	const shelf = loadShelf(db, slugOf(params));
	if (!shelf) error(404, 'Shelf not found');
	return shelf;
}

/**
 * A Shelf's page (apostillas-v3/02): its Books in order, plus the whole library
 * (title, authors, cover) for "+ Add books", which searches it in the browser.
 */
export const load: PageServerLoad = ({ params }) => {
	const shelf = requireShelf(params);
	const library = loadLibrary(db)
		.map((book) => ({
			bookId: book.id,
			title: book.title,
			authors: book.authors,
			coverPath: book.coverPath,
			tags: book.tags
		}))
		.sort((a, b) => a.title.localeCompare(b.title));
	return { shelf, library };
};

function text(form: FormData, key: string): string {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

function bookId(form: FormData): number | null {
	const n = Number(form.get('bookId'));
	return Number.isInteger(n) && n > 0 ? n : null;
}

/** A comma-separated list of ids, e.g. "3,1,2". */
function ids(form: FormData, key: string): number[] {
	return text(form, key)
		.split(',')
		.map(Number)
		.filter((n) => Number.isInteger(n) && n > 0);
}

export const actions: Actions = {
	rename: async ({ params, request }) => {
		const shelf = requireShelf(params);
		const form = await request.formData();
		const res = renameShelf(db, shelf.id, text(form, 'name'));
		if (!res.ok) return fail(400, { renameError: res.error });
		// The address follows the name.
		if (res.slug !== shelf.slug) redirect(303, `/bookcase/${encodeURIComponent(res.slug)}`);
	},

	describe: async ({ params, request }) => {
		const shelf = requireShelf(params);
		setShelfDescription(db, shelf.id, text(await request.formData(), 'description'));
	},

	add: async ({ params, request }) => {
		const shelf = requireShelf(params);
		const id = bookId(await request.formData());
		if (id !== null && loadLibrary(db).some((book) => book.id === id)) {
			addBookToShelf(db, shelf.id, id);
		}
	},

	remove: async ({ params, request }) => {
		const shelf = requireShelf(params);
		const id = bookId(await request.formData());
		if (id !== null) removeBookFromShelf(db, shelf.id, id);
	},

	arrange: async ({ params, request }) => {
		const shelf = requireShelf(params);
		const form = await request.formData();
		arrangeShelf(db, shelf.id, ids(form, 'order'), ids(form, 'removed'));
	},

	delete: ({ params }) => {
		const shelf = requireShelf(params);
		deleteShelf(db, shelf.id);
		redirect(303, '/bookcase');
	}
};
