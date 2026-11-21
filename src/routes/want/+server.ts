import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Old URL of the Want to read list, now Bookstack. */
export const GET: RequestHandler = ({ url }) => {
	redirect(301, `/bookstack${url.search}`);
};
