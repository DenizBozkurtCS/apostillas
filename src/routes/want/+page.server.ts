import { db } from '#lib/server/db';
import { getLists } from '#lib/server/lists';
import type { PageServerLoad } from './$types';

/** Want to read: Books with no Reads, showing date added and "why". */
export const load: PageServerLoad = () => {
	return { wantToRead: getLists(db).wantToRead };
};
