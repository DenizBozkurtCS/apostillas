import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Old URL of Marginalia (it was called Notes & Quotes). */
export const GET: RequestHandler = () => {
	redirect(301, '/marginalia');
};
