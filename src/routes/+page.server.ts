import { db } from '../lib/server/db';
import { getLists } from '../lib/server/lists';
import type { PageServerLoad } from './$types';

/** Reading is the home screen (spec); show the Books with an open Read. */
export const load: PageServerLoad = () => {
	return { reading: getLists(db).reading };
};
