/**
 * The optional single-password gate (ADR-0001). apostillas serves one reader,
 * so there is no user model: when `APP_PASSWORD` is set the whole app sits
 * behind that one password; when it is unset there is no login at all.
 *
 * This module is the pure core of the gate — reading the password, deriving the
 * session token, and the constant-time checks — so it can be unit tested. The
 * `hooks.server.ts` handle and the `login`/`logout` routes wire it to requests.
 */

import crypto from 'node:crypto';

/** Name of the cookie that marks a browser as having entered the password. */
export const SESSION_COOKIE = 'apostillas_session';

/** The only path reachable without a session when the gate is on. */
export const LOGIN_PATH = '/login';

/**
 * The configured gate password, or `null` when the app is open. An empty or
 * whitespace-only `APP_PASSWORD` counts as unset so the app is never left
 * behind a blank password that any empty submission would satisfy.
 */
export function appPassword(): string | null {
	const value = process.env.APP_PASSWORD;
	return value && value.trim() !== '' ? value : null;
}

/** Whether the single-password gate is active (an `APP_PASSWORD` is set). */
export function isGated(): boolean {
	return appPassword() !== null;
}

/**
 * The value stored in the session cookie: a hash of the password, so the cookie
 * never carries the password itself and every stored session is invalidated the
 * moment the password changes.
 */
export function sessionToken(password: string): string {
	return crypto.createHash('sha256').update(`apostillas:${password}`).digest('hex');
}

/** Constant-time equality for two secrets of possibly different length. */
function constantTimeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	if (left.length !== right.length) return false;
	return crypto.timingSafeEqual(left, right);
}

/** Whether a submitted password matches the gate password (constant time). */
export function passwordMatches(input: string, password: string): boolean {
	return constantTimeEqual(input, password);
}

/** Whether a cookie value is a session that authorises access for `password`. */
export function isValidSession(cookieValue: string | undefined, password: string): boolean {
	if (!cookieValue) return false;
	return constantTimeEqual(cookieValue, sessionToken(password));
}

/**
 * Paths reachable without a session while the gate is on: the login page and
 * SvelteKit's own framework assets, so the login page can load its styles and
 * scripts. Every other route — including stored covers — is gated.
 */
export function isPublicPath(pathname: string): boolean {
	return pathname === LOGIN_PATH || pathname.startsWith('/_app/');
}

/**
 * Options for the session cookie: httpOnly so scripts can't read it, lax so a
 * normal navigation carries it, and secure in production so it is only ever
 * sent over HTTPS.
 */
export function sessionCookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 365
	};
}
