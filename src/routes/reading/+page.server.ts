import { db } from '#lib/server/db';
import { getLists } from '#lib/server/lists';
import type { PageServerLoad } from './$types';

/** The Reading list: the Books with an open Read. */
export const load: PageServerLoad = () => {
	return { reading: getLists(db).reading };
};
