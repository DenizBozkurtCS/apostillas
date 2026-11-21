import { describe, expect, it } from 'vitest';
import { LoginThrottle } from './throttle';

const options = {
	freeTries: 3,
	baseDelayMs: 1_000,
	maxDelayMs: 8_000,
	forgetAfterMs: 60_000,
	maxEntries: 2
};

describe('LoginThrottle', () => {
	it('allows a few wrong passwords, then waits longer after each one, up to the cap', () => {
		const t = new LoginThrottle(options);
		let now = 0;
		for (let i = 0; i < 3; i++) {
			expect(t.waitSeconds('ip', now)).toBe(0);
			t.failed('ip', now);
		}
		expect(t.waitSeconds('ip', now)).toBe(0); // three free tries used, no wait yet

		const waits: number[] = [];
		for (let i = 0; i < 6; i++) {
			t.failed('ip', now);
			waits.push(t.waitSeconds('ip', now));
			now += waits.at(-1)! * 1000; // wait it out, then try again
		}
		expect(waits).toEqual([1, 2, 4, 8, 8, 8]);
	});

	it('is per client, so one client cannot make another wait', () => {
		const t = new LoginThrottle(options);
		for (let i = 0; i < 6; i++) t.failed('attacker', 0);
		expect(t.waitSeconds('attacker', 0)).toBeGreaterThan(0);
		expect(t.waitSeconds('owner', 0)).toBe(0);
	});

	it('clears on a right password and forgets after a quiet spell', () => {
		const t = new LoginThrottle(options);
		for (let i = 0; i < 5; i++) t.failed('ip', 0);
		t.succeeded('ip');
		expect(t.waitSeconds('ip', 0)).toBe(0);

		for (let i = 0; i < 5; i++) t.failed('ip', 0);
		expect(t.waitSeconds('ip', 0)).toBeGreaterThan(0);
		// Long after the wait and the quiet spell, the next wrong password is free again.
		t.failed('ip', 120_000);
		expect(t.waitSeconds('ip', 120_000)).toBe(0);
	});

	it('remembers a bounded number of clients', () => {
		const t = new LoginThrottle(options);
		t.failed('a', 0);
		t.failed('b', 0);
		t.failed('c', 0);
		// 'a' was the stalest and has been dropped; the newest are kept.
		for (let i = 0; i < 4; i++) t.failed('c', 0);
		expect(t.waitSeconds('c', 0)).toBeGreaterThan(0);
	});
});
