/**
 * The optional single-password gate (ADR-0001). apostillas serves one reader,
 * so there is no user model: when `APP_PASSWORD` is set the whole app sits
 * behind that one password; when it is unset there is no login at all.
 *
 * This module is the core of the gate — reading the password, the signing
 * secret, the session token, and the constant-time checks — so it can be unit
 * tested. The
 * `hooks.server.ts` handle and the `login`/`logout` routes wire it to requests.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDataDir } from './paths';

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

/** Name of the file, in the data folder, holding the key that signs sessions. */
export const SECRET_FILENAME = 'session-secret';

const secrets = new Map<string, Buffer>();

/**
 * The random key that signs session cookies, read from the data folder. It is
 * made (32 random bytes, readable by the owner only) the first time it is
 * needed. Deleting the file logs every browser out.
 */
export function sessionSecret(folder: string = ensureDataDir()): Buffer {
	const file = path.join(folder, SECRET_FILENAME);
	const cached = secrets.get(file);
	if (cached) return cached;

	let secret: Buffer;
	try {
		secret = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
	} catch {
		secret = Buffer.alloc(0);
	}
	if (secret.length < 32) {
		const fresh = crypto.randomBytes(32);
		try {
			// 'wx': if another request made it first, use theirs.
			fs.writeFileSync(file, fresh.toString('hex'), { flag: 'wx', mode: 0o600 });
			secret = fresh;
		} catch {
			secret = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
		}
	}
	secrets.set(file, secret);
	return secret;
}

/**
 * The value stored in the session cookie: an HMAC of the password under the
 * data folder's secret. The cookie reveals nothing about the password and
 * can't be used to guess it offline, and every session ends the moment the
 * password (or the secret) changes.
 */
export function sessionToken(password: string, secret: Buffer = sessionSecret()): string {
	return crypto.createHmac('sha256', secret).update(`apostillas-session:${password}`).digest('hex');
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
export function isValidSession(
	cookieValue: string | undefined,
	password: string,
	secret: Buffer = sessionSecret()
): boolean {
	if (!cookieValue) return false;
	return constantTimeEqual(cookieValue, sessionToken(password, secret));
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
 * Options for the session cookie: httpOnly so scripts can't read it, and lax so
 * a normal navigation carries it. `secure` is deliberately left to SvelteKit,
 * whose default is secure everywhere except dev and http://localhost. Basing it
 * on NODE_ENV would leave it off in production, because `node build` doesn't
 * set NODE_ENV.
 */
export function sessionCookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		maxAge: 60 * 60 * 24 * 365
	};
}
