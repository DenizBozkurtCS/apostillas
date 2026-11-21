import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Old URL of a Shelf's page (under the Bookcase, now Shelves). */
export const GET: RequestHandler = ({ params }) => {
	redirect(301, `/shelves/${encodeURIComponent(params.slug)}`);
};
