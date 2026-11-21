/**
 * The single-password gate (ADR-0001). When `APP_PASSWORD` is set, every
 * request without a valid session cookie is redirected to the login page;
 * when it is unset the app is open and this hook does nothing.
 */

import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { appPassword, isPublicPath, isValidSession, LOGIN_PATH, SESSION_COOKIE } from '#lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const password = appPassword();
	if (!password) {
		event.locals.authenticated = true;
		return resolve(event);
	}

	const authenticated = isValidSession(event.cookies.get(SESSION_COOKIE), password);
	event.locals.authenticated = authenticated;

	if (!authenticated && !isPublicPath(event.url.pathname)) {
		redirect(303, LOGIN_PATH);
	}

	return resolve(event);
};
