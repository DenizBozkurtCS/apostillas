/**
 * Log out: clear the session cookie and return to the login page. POST-only so
 * it rides SvelteKit's cross-origin form protection; the layout's "Log out"
 * button submits here.
 */

import { redirect } from '@sveltejs/kit';
import { sessionCookieOptions, SESSION_COOKIE } from '#lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, sessionCookieOptions());
	redirect(303, '/login');
};
