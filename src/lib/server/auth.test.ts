import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	appPassword,
	isGated,
	isPublicPath,
	isValidSession,
	passwordMatches,
	SECRET_FILENAME,
	sessionCookieOptions,
	sessionSecret,
	sessionToken
} from './auth';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apostillas-auth-'));
const SECRET = crypto.randomBytes(32);

const ORIGINAL = { APP_PASSWORD: process.env.APP_PASSWORD, NODE_ENV: process.env.NODE_ENV };

afterEach(() => {
	for (const [key, value] of Object.entries(ORIGINAL)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
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

describe('sessionSecret', () => {
	it('is made on first use, owner-readable, and the same afterwards', () => {
		const dir = tempDir();
		const first = sessionSecret(dir);
		expect(first.length).toBe(32);
		const file = path.join(dir, SECRET_FILENAME);
		expect(fs.readFileSync(file, 'utf8')).toBe(first.toString('hex'));
		if (process.platform !== 'win32') expect(fs.statSync(file).mode & 0o777).toBe(0o600);
		expect(sessionSecret(dir).equals(first)).toBe(true);
	});

	it('differs between data folders', () => {
		expect(sessionSecret(tempDir()).equals(sessionSecret(tempDir()))).toBe(false);
	});
});

describe('session token and validation', () => {
	it('reveals nothing about the password: not it, nor its plain hash', () => {
		const token = sessionToken('hunter2', SECRET);
		expect(token).not.toContain('hunter2');
		const plain = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
		expect(token).not.toBe(plain('hunter2'));
		expect(token).not.toBe(plain('apostillas:hunter2'));
	});

	it('accepts a cookie holding the token for the current password and secret', () => {
		const password = 'hunter2';
		expect(isValidSession(sessionToken(password, SECRET), password, SECRET)).toBe(true);
	});

	it('rejects a missing cookie, the raw password, another password, or another secret', () => {
		const password = 'hunter2';
		expect(isValidSession(undefined, password, SECRET)).toBe(false);
		expect(isValidSession('', password, SECRET)).toBe(false);
		expect(isValidSession(password, password, SECRET)).toBe(false);
		// Changing APP_PASSWORD logs every session out.
		expect(isValidSession(sessionToken('old-password', SECRET), password, SECRET)).toBe(false);
		// So does a new secret (deleting the secret file).
		expect(isValidSession(sessionToken(password, crypto.randomBytes(32)), password, SECRET)).toBe(false);
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
