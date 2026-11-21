import { db } from '#lib/server/db';
import { searchAnnotations } from '#lib/server/search';
import type { PageServerLoad } from './$types';

/**
 * Full-text search across Quotes and Notes (apostillas-v1/08). The query lives
 * in the `q` URL parameter so a search is a shareable, reloadable GET; an empty
 * query just shows the box.
 */
export const load: PageServerLoad = ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const searched = q.trim() !== '';
	return { q, searched, hits: searched ? searchAnnotations(db, q) : [] };
};
