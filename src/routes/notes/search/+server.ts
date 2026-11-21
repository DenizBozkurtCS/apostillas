import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { searchAnnotations } from '#lib/server/search';
import type { RequestHandler } from './$types';

/**
 * Live search for the Notes & Quotes page: ranked matches as
 * `{ kind, refId, snippetHtml }`. The page fetches this as you type, so the
 * search never goes into the page's URL. `snippetHtml` is escaped server-side
 * with <mark> around the matched terms (see #lib/server/search).
 */
export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const hits = searchAnnotations(db, q).map(({ kind, refId, snippetHtml }) => ({
		kind,
		refId,
		snippetHtml
	}));
	return json({ hits });
};
