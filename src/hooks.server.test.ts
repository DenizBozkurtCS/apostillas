import { afterEach, describe, expect, it } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { handle } from './hooks.server';
import { sessionToken, SESSION_COOKIE } from '#lib/server/auth';

const ORIGINAL = process.env.APP_PASSWORD;

afterEach(() => {
	process.env.APP_PASSWORD = ORIGINAL;
});

/** A minimal RequestEvent: just the cookie jar, pathname, and locals the hook touches. */
function fakeEvent(pathname: string, cookie?: string) {
	const locals: Record<string, unknown> = {};
	return {
		locals,
		url: new URL(`http://localhost${pathname}`),
		cookies: { get: (name: string) => (name === SESSION_COOKIE ? cookie : undefined) }
	} as unknown as Parameters<typeof handle>[0]['event'];
}

const resolve = async () => new Response('ok');

async function run(pathname: string, cookie?: string) {
	const event = fakeEvent(pathname, cookie);
	try {
		const response = await handle({ event, resolve });
		return { event, response, redirect: undefined as undefined | string };
	} catch (e) {
		if (isRedirect(e)) return { event, response: undefined, redirect: e.location };
		throw e;
	}
}

describe('gate hook, no APP_PASSWORD', () => {
	it('lets every request through and marks it authenticated', async () => {
		delete process.env.APP_PASSWORD;
		const { response, event, redirect } = await run('/add');
		expect(redirect).toBeUndefined();
		expect(response).toBeDefined();
		expect(event.locals.authenticated).toBe(true);
	});
});

describe('gate hook, APP_PASSWORD set', () => {
	it('redirects an unauthenticated request to the login page', async () => {
		process.env.APP_PASSWORD = 'hunter2';
		const { redirect, event } = await run('/add');
		expect(redirect).toBe('/login');
		expect(event.locals.authenticated).toBe(false);
	});

	it('redirects a request with the wrong cookie', async () => {
		process.env.APP_PASSWORD = 'hunter2';
		const { redirect } = await run('/', sessionToken('other-password'));
		expect(redirect).toBe('/login');
	});

	it('lets the login page and framework assets through unauthenticated', async () => {
		process.env.APP_PASSWORD = 'hunter2';
		expect((await run('/login')).redirect).toBeUndefined();
		expect((await run('/_app/immutable/x.js')).redirect).toBeUndefined();
	});

	it('lets a request with a valid session cookie through', async () => {
		process.env.APP_PASSWORD = 'hunter2';
		const { redirect, response, event } = await run('/add', sessionToken('hunter2'));
		expect(redirect).toBeUndefined();
		expect(response).toBeDefined();
		expect(event.locals.authenticated).toBe(true);
	});
});
