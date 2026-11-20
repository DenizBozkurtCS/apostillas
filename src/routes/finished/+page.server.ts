import { db } from '../../lib/server/db';
import { getLists } from '../../lib/server/lists';
import type { PageServerLoad } from './$types';

/** Finished: newest finish first, with rating and a reread marker. */
export const load: PageServerLoad = () => {
	return { finished: getLists(db).finished };
};
