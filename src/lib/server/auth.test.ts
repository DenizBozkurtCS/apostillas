import { afterEach, describe, expect, it } from 'vitest';
import {
	appPassword,
	isGated,
	isPublicPath,
	isValidSession,
	passwordMatches,
	sessionCookieOptions,
	sessionToken
} from './auth';

const ORIGINAL = { APP_PASSWORD: process.env.APP_PASSWORD, NODE_ENV: process.env.NODE_ENV };

afterEach(() => {
	process.env.APP_PASSWORD = ORIGINAL.APP_PASSWORD;
	process.env.NODE_ENV = ORIGINAL.NODE_ENV;
});

describe('appPassword', () => {
	it('returns null when unset so the app is open', () => {
		delete process.env.APP_PASSWORD;
		expect(appPassword()).toBeNull();
		expect(isGated()).toBe(false);
	});

	it('treats a blank password as unset', () => {
		process.env.APP_PASSWORD = '   ';
		expect(appPassword()).toBeNull();
		expect(isGated()).toBe(false);
	});

	it('returns the password and reports the gate active when set', () => {
		process.env.APP_PASSWORD = 'hunter2';
		expect(appPassword()).toBe('hunter2');
		expect(isGated()).toBe(true);
	});
});

describe('passwordMatches', () => {
	it('accepts the exact password and rejects anything else', () => {
		expect(passwordMatches('hunter2', 'hunter2')).toBe(true);
		expect(passwordMatches('hunter3', 'hunter2')).toBe(false);
		expect(passwordMatches('', 'hunter2')).toBe(false);
		expect(passwordMatches('hunter2 ', 'hunter2')).toBe(false);
	});
});

describe('session token and validation', () => {
	it('does not contain the password', () => {
		expect(sessionToken('hunter2')).not.toContain('hunter2');
	});

	it('accepts a cookie holding the token for the current password', () => {
		const password = 'hunter2';
		expect(isValidSession(sessionToken(password), password)).toBe(true);
	});

	it('rejects a missing cookie, the raw password, or a token for another password', () => {
		const password = 'hunter2';
		expect(isValidSession(undefined, password)).toBe(false);
		expect(isValidSession('', password)).toBe(false);
		expect(isValidSession(password, password)).toBe(false);
		expect(isValidSession(sessionToken('old-password'), password)).toBe(false);
	});
});

describe('isPublicPath', () => {
	it('allows the login page and framework assets only', () => {
		expect(isPublicPath('/login')).toBe(true);
		expect(isPublicPath('/_app/immutable/chunk.js')).toBe(true);
		expect(isPublicPath('/')).toBe(false);
		expect(isPublicPath('/add')).toBe(false);
		expect(isPublicPath('/covers/abc.jpg')).toBe(false);
		expect(isPublicPath('/logout')).toBe(false);
	});
});

describe('sessionCookieOptions', () => {
	it('is httpOnly and lax, and leaves secure to SvelteKit', () => {
		const options = sessionCookieOptions();
		expect(options.httpOnly).toBe(true);
		expect(options.sameSite).toBe('lax');
		expect(options.path).toBe('/');
		// SvelteKit then makes it secure everywhere except dev and http://localhost.
		expect('secure' in options).toBe(false);
	});
});
