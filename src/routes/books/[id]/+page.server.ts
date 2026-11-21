import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { coversDir } from '#lib/server/paths';
import { fetchWorkEditionCovers } from '#lib/server/booksearch';
import { checkCover, MAX_COVER_BYTES } from '#lib/server/covers';
import {
	applyReadMutation,
	deleteBook,
	loadBookDetail,
	setBookCoverFromBytes,
	setBookCoverFromUrl,
	updateBookMetadata,
	type BookDetail
} from '#lib/server/book';
import {
	abandon,
	deleteRead,
	editRead,
	finish,
	isReread,
	logPastFinished,
	readingStatus,
	revertToWantToRead,
	start,
	statusAfterDeleting,
	type EditReadFields,
	type OpResult
} from '#lib/domain/reading';
import { deleteReadMessage } from '#lib/format';
import type { Actions, PageServerLoad } from './$types';

/** Today as an ISO day (`YYYY-MM-DD`) in the server's local time. */
function todayISO(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

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
	const detail = requireBook(id);
	const { book, reads, quoteCount, noteCount } = detail;
	const status = readingStatus(reads);
	const annotationCount = quoteCount + noteCount;

	// Newest Read first: by date (start, or end for a logged past Read), ties by id.
	const anchor = (r: (typeof reads)[number]) => r.startDate ?? r.endDate ?? '';
	const ordered = [...reads].sort((a, b) => {
		const aa = anchor(a);
		const bb = anchor(b);
		if (aa !== bb) return aa < bb ? 1 : -1;
		return b.id - a.id;
	});

	const readItems = ordered.map((r) => ({
		...r,
		isReread: isReread(r, reads),
		deleteMessage: deleteReadMessage({
			title: book.title,
			currentStatus: status,
			statusAfterDelete: statusAfterDeleting(r, reads),
			annotationCount
		})
	}));

	// Edition covers are fetched over the network only when the reader opens the
	// cover picker (`?covers=1`) on a Book that has an Open Library work ID.
	const editionCovers =
		url.searchParams.get('covers') === '1' && book.workId
			? await fetchWorkEditionCovers(book.workId)
			: null;

	return { book, status, reads: readItems, quoteCount, noteCount, editionCovers };
};

/** Apply an operation's mutation, or turn its refusal into a 400. */
function applyOp(id: number, op: OpResult) {
	if (!op.ok) return fail(400, { error: op.error });
	applyReadMutation(db, id, op.mutation);
}

export const actions: Actions = {
	start: ({ params }) => {
		const id = parseId(params.id);
		const { reads } = requireBook(id);
		return applyOp(id, start(reads, todayISO()));
	},

	finish: async ({ params, request }) => {
		const id = parseId(params.id);
		const { reads } = requireBook(id);
		const form = await request.formData();
		return applyOp(
			id,
			finish(reads, todayISO(), {
				endDate: optional(form.get('endDate')) ?? undefined,
				rating: optionalNumber(form.get('rating')),
				readBefore: form.get('readBefore') != null
			})
		);
	},

	abandon: ({ params }) => {
		const id = parseId(params.id);
		const { reads } = requireBook(id);
		return applyOp(id, abandon(reads, todayISO()));
	},

	backToWant: ({ params }) => {
		const id = parseId(params.id);
		const { reads } = requireBook(id);
		return applyOp(id, revertToWantToRead(reads));
	},

	logPast: async ({ params, request }) => {
		const id = parseId(params.id);
		const { reads } = requireBook(id);
		const form = await request.formData();
		return applyOp(
			id,
			logPastFinished(reads, {
				endDate: optional(form.get('endDate')) ?? todayISO(),
				rating: optionalNumber(form.get('rating')),
				readBefore: form.get('readBefore') != null
			})
		);
	},

	editRead: async ({ params, request }) => {
		const id = parseId(params.id);
		const { reads } = requireBook(id);
		const form = await request.formData();
		const readId = optionalNumber(form.get('readId'));
		const read = reads.find((r) => r.id === readId);
		if (!read) return fail(400, { error: 'That Read no longer exists.' });

		const fields: EditReadFields = {};
		if (form.has('startDate')) fields.startDate = optional(form.get('startDate'));
		if (form.has('endDate')) fields.endDate = optional(form.get('endDate'));
		if (form.has('rating')) fields.rating = optionalNumber(form.get('rating'));
		return applyOp(id, editRead(read, fields));
	},

	deleteRead: async ({ params, request }) => {
		const id = parseId(params.id);
		const { reads } = requireBook(id);
		const form = await request.formData();
		const readId = optionalNumber(form.get('readId'));
		const read = reads.find((r) => r.id === readId);
		if (!read) return fail(400, { error: 'That Read no longer exists.' });
		applyReadMutation(db, id, deleteRead(read));
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
			pageCount: optionalNumber(form.get('pageCount')),
			whyRecommended: optional(form.get('whyRecommended'))
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

	deleteBook: ({ params }) => {
		const id = parseId(params.id);
		requireBook(id);
		deleteBook(db, coversDir(), id);
		redirect(303, '/');
	}
};
