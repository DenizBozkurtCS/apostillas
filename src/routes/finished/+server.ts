import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Old URL of the Finished list, now Books. */
export const GET: RequestHandler = ({ url }) => {
	redirect(301, `/books${url.search}`);
};
