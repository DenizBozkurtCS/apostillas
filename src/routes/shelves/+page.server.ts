import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { createShelf, deleteShelf, loadShelves, moveShelf, renameShelf } from '#lib/server/shelves';
import type { Actions, PageServerLoad } from './$types';

/** Shelves (once the Bookcase, apostillas-v3/01): every Shelf, in the reader's order. */
export const load: PageServerLoad = () => {
	return { shelves: loadShelves(db) };
};

function text(form: FormData, key: string): string {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

function shelfId(form: FormData): number | null {
	const n = Number(form.get('shelfId'));
	return Number.isInteger(n) && n > 0 ? n : null;
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const res = createShelf(db, text(form, 'name'), text(form, 'description'));
		if (!res.ok) return fail(400, { createError: res.error, name: text(form, 'name') });
	},

	rename: async ({ request }) => {
		const form = await request.formData();
		const id = shelfId(form);
		if (id === null) return fail(400, { renameError: 'That Shelf no longer exists.' });
		const res = renameShelf(db, id, text(form, 'name'));
		if (!res.ok) return fail(400, { renameError: res.error, renameId: id });
	},

	move: async ({ request }) => {
		const form = await request.formData();
		const id = shelfId(form);
		const direction = form.get('direction');
		if (id !== null && (direction === 'up' || direction === 'down')) moveShelf(db, id, direction);
	},

	delete: async ({ request }) => {
		const id = shelfId(await request.formData());
		if (id !== null) deleteShelf(db, id);
	}
};
