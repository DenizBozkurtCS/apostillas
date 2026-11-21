import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Search moved into the Notes & Quotes page (apostillas-v2/02). */
export const GET: RequestHandler = () => {
	redirect(301, '/notes');
};
