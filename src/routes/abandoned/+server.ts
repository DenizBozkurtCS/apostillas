import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Abandoned was removed in v4 (ADR-0006); its old URL goes to Reading. */
export const GET: RequestHandler = () => {
	redirect(301, '/reading');
};
