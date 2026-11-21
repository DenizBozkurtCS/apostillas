import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { todayISO } from '#lib/server/book';
import { loadLibrary } from '#lib/server/lists';
import {
	addImpression,
	deleteImpression,
	editImpression,
	impressionFromForm,
	loadAllImpressions
} from '#lib/server/impressions';
import type { Actions, PageServerLoad } from './$types';

/**
 * My Reading (apostillas-v4/03): every Impression, newest first, and every
 * Book a new one can be left on. Each write is scoped to the Book the form
 * names, through #lib/server/impressions.
 */
export const load: PageServerLoad = () => {
	const books = loadLibrary(db)
		.map((b) => ({ bookId: b.id, title: b.title, authors: b.authors, coverPath: b.coverPath, tags: [] }))
		.sort((a, b) => a.title.localeCompare(b.title));
	return { impressions: loadAllImpressions(db), books, today: todayISO() };
};

function id(value: FormDataEntryValue | null): number | null {
	const n = Number(value);
	return typeof value === 'string' && Number.isInteger(n) && n > 0 ? n : null;
}

const bookExists = (bookId: number) => loadLibrary(db).some((b) => b.id === bookId);

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const bookId = id(form.get('bookId'));
		if (bookId === null) return fail(400, { error: 'Choose which Book the Impression is about.', editId: null });
		if (!bookExists(bookId)) return fail(400, { error: 'That Book no longer exists.', editId: null });
		const check = impressionFromForm(form);
		if (!check.ok) return fail(400, { error: check.error, editId: null });
		addImpression(db, bookId, check.input);
	},

	edit: async ({ request }) => {
		const form = await request.formData();
		const bookId = id(form.get('bookId'));
		const impressionId = id(form.get('impressionId'));
		const check = impressionFromForm(form);
		if (!check.ok) return fail(400, { error: check.error, editId: impressionId });
		if (bookId === null || impressionId === null || !editImpression(db, bookId, impressionId, check.input)) {
			return fail(400, { error: 'That Impression no longer exists.', editId: null });
		}
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const bookId = id(form.get('bookId'));
		const impressionId = id(form.get('impressionId'));
		if (bookId !== null && impressionId !== null) deleteImpression(db, bookId, impressionId);
	}
};
