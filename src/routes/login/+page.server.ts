import { fail, redirect } from '@sveltejs/kit';
import {
	appPassword,
	passwordMatches,
	sessionCookieOptions,
	sessionToken,
	SESSION_COOKIE
} from '#lib/server/auth';
import { loginThrottle } from '#lib/server/throttle';
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
	default: async ({ request, cookies, getClientAddress }) => {
		const password = appPassword();
		if (!password) {
			redirect(303, '/');
		}

		// Too many wrong passwords from this address: refuse without checking.
		const client = clientKey(getClientAddress);
		const wait = loginThrottle.waitSeconds(client);
		if (wait > 0) {
			return fail(429, { error: tooMany(wait) });
		}

		const form = await request.formData();
		const input = form.get('password');
		if (typeof input !== 'string' || !passwordMatches(input, password)) {
			loginThrottle.failed(client);
			const next = loginThrottle.waitSeconds(client);
			return fail(401, { error: next > 0 ? `Incorrect password. ${tooMany(next)}` : 'Incorrect password.' });
		}

		loginThrottle.succeeded(client);
		cookies.set(SESSION_COOKIE, sessionToken(password), sessionCookieOptions());
		redirect(303, '/');
	}
};

/** The client's address, for the throttle; one shared key if it can't be told. */
function clientKey(getClientAddress: () => string): string {
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}

function tooMany(seconds: number): string {
	return `Too many wrong passwords. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
}
