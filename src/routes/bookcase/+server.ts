import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Old URL of the Shelves page (it was called the Bookcase). */
export const GET: RequestHandler = () => {
	redirect(301, '/shelves');
};
