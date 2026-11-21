import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { coversDir } from '#lib/server/paths';
import { addBook } from '#lib/server/books';
import { BookSearchUnavailable } from '#lib/server/booksearch';
import {
	fetchGoodreadsBook,
	findByLinkTitle,
	goodreadsBookUrl,
	GoodreadsError,
	GoodreadsRefused
} from '#lib/server/goodreads';
import { loadLibrary } from '#lib/server/lists';
import { allBooks } from '#lib/domain/lists';
import type { Actions, PageServerLoad } from './$types';

/**
 * All books: every Book in the library, whatever its Reading Statuses. Not
 * linked from anywhere; you reach it by typing /all. Books can be added here
 * by pasting a Goodreads link.
 */
export const load: PageServerLoad = () => {
	return { books: allBooks(loadLibrary(db)) };
};

export const actions: Actions = {
	/**
	 * Add the Book a Goodreads link points at, with no Reading Status. A Book
	 * already in the library (same title and authors) is not added twice. When
	 * Goodreads won't send the page, the title spelled out in the link is looked
	 * up with the book search instead (`via` says which provider found it).
	 */
	goodreads: async ({ request }) => {
		const form = await request.formData();
		const raw = form.get('link');
		const link = typeof raw === 'string' ? raw.trim() : '';
		if (link === '') return fail(400, { link, error: 'Paste a Goodreads book link.' });

		const url = goodreadsBookUrl(link);
		if (url === null) {
			return fail(400, {
				link,
				error: 'That isn’t a Goodreads book link. It should look like goodreads.com/book/show/…'
			});
		}

		let result;
		try {
			result = await fetchGoodreadsBook(url);
		} catch (err) {
			if (!(err instanceof GoodreadsError)) throw err;
			if (!(err instanceof GoodreadsRefused)) return fail(502, { link, error: err.message });
			try {
				result = await findByLinkTitle(url);
			} catch (searchErr) {
				if (!(searchErr instanceof BookSearchUnavailable)) throw searchErr;
				result = null;
			}
			if (result === null) return fail(502, { link, error: err.message });
		}

		const { bookId, created } = await addBook({ db, coversDir: coversDir() }, { result });
		const via = result.source === 'goodreads' ? null : result.source;
		return { added: { bookId, created, title: result.title, via } };
	}
};
