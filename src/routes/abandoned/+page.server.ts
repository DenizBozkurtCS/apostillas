import { db } from '../../lib/server/db';
import { getLists } from '../../lib/server/lists';
import type { PageServerLoad } from './$types';

/** Abandoned: Books stopped without finishing, showing the date abandoned. */
export const load: PageServerLoad = () => {
	return { abandoned: getLists(db).abandoned };
};
