import { db } from '#lib/server/db';
import { getLists } from '#lib/server/lists';
import type { PageServerLoad } from './$types';

/** Bookstack (Want to read): Books with no Reads, most recently added first. */
export const load: PageServerLoad = () => {
	return { wantToRead: getLists(db).wantToRead };
};
