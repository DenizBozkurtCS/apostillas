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
	syncBookMetadata,
	todayISO,
	updateBookMetadata,
	type BookDetail
} from '#lib/server/book';
import {
	abandon,
	canAnnotate,
	deleteRead,
	editRead,
	finish,
	isReread,
	logPastFinished,
	openRead,
	readingStatus,
	revertToWantToRead,
	start,
	statusAfterDeleting,
	type EditReadFields,
	type OpResult
} from '#lib/domain/reading';
import {
	addNote,
	addQuote,
	deleteNote,
	deleteQuote,
	editNote,
	editQuote,
	loadAnnotations
} from '#lib/server/annotations';
import { deleteReadMessage } from '#lib/format';
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

	const annotations = loadAnnotations(db, id);

	return {
		book,
		status,
		reads: readItems,
		quoteCount,
		noteCount,
		editionCovers,
		quotes: annotations.quotes,
		notes: annotations.notes,
		// Quotes and Notes can only be added once the Book is no longer Want to read.
		canAnnotate: canAnnotate(status),
		// New Quotes and Notes default to the open Read, when there is one.
		defaultReadId: openRead(reads)?.id ?? null
	};
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
		const { reads } = requireBook(id);
		if (!canAnnotate(readingStatus(reads))) {
			return fail(400, { quoteError: 'Start this Book before adding Quotes.' });
		}
		const form = await request.formData();
		const text = optional(form.get('text'));
		if (text === null) return fail(400, { quoteError: 'A Quote needs some text.' });
		addQuote(db, id, {
			text,
			location: optional(form.get('location')),
			readId: optionalNumber(form.get('readId'))
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
				location: optional(form.get('location')),
				readId: optionalNumber(form.get('readId'))
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
		const { reads } = requireBook(id);
		if (!canAnnotate(readingStatus(reads))) {
			return fail(400, { noteError: 'Start this Book before adding Notes.' });
		}
		const form = await request.formData();
		const body = optional(form.get('body'));
		if (body === null) return fail(400, { noteError: 'A Note needs some text.' });
		addNote(db, id, { body, readId: optionalNumber(form.get('readId')) });
	},

	editNote: async ({ params, request }) => {
		const id = parseId(params.id);
		requireBook(id);
		const form = await request.formData();
		const noteId = optionalNumber(form.get('noteId'));
		if (noteId === null) return fail(400, { noteError: 'That Note no longer exists.' });
		const body = optional(form.get('body'));
		if (body === null) return fail(400, { noteError: 'A Note needs some text.' });
		if (!editNote(db, id, noteId, { body, readId: optionalNumber(form.get('readId')) })) {
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

	deleteBook: ({ params }) => {
		const id = parseId(params.id);
		requireBook(id);
		deleteBook(db, coversDir(), id);
		redirect(303, '/reading');
	}
};
