import { fail, redirect } from '@sveltejs/kit';
import {
	appPassword,
	passwordMatches,
	sessionCookieOptions,
	sessionToken,
	SESSION_COOKIE
} from '#lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

/**
 * The login page only exists while the gate is on; send an open app, or an
 * already-authenticated reader, straight to the Reading home.
 */
export const load: PageServerLoad = ({ locals }) => {
	if (!appPassword() || locals.authenticated) {
		redirect(303, '/');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const password = appPassword();
		if (!password) {
			redirect(303, '/');
		}

		const form = await request.formData();
		const input = form.get('password');
		if (typeof input !== 'string' || !passwordMatches(input, password)) {
			return fail(401, { error: 'Incorrect password.' });
		}

		cookies.set(SESSION_COOKIE, sessionToken(password), sessionCookieOptions());
		redirect(303, '/');
	}
};
