import { db } from '#lib/server/db';
import { getLists } from '#lib/server/lists';
import type { PageServerLoad } from './$types';

/** Books (Finished): most recently finished first, with rating and a Reread marker. */
export const load: PageServerLoad = () => {
	return { finished: getLists(db).finished };
};
