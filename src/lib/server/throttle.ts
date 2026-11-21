/**
 * Slows down password guessing on the login page (issue 10). Each client
 * (keyed by IP address) gets a few free tries; after that every wrong password
 * makes it wait twice as long as the last time before it may try again, up to
 * a short cap. So guessing gets very slow, while someone else on the same
 * address can never lock the owner out for more than the cap. A right
 * password clears the client's record; a quiet spell forgets it.
 *
 * Kept in memory: a restart forgets it, which is fine for one reader.
 */

export interface ThrottleOptions {
	/** Wrong passwords allowed before any waiting. */
	freeTries: number;
	/** The first wait, in ms; each further wrong password doubles it. */
	baseDelayMs: number;
	/** The longest wait, in ms. */
	maxDelayMs: number;
	/** A client with no attempt for this long starts fresh. */
	forgetAfterMs: number;
	/** Most clients remembered at once; the stalest are dropped beyond it. */
	maxEntries: number;
}

export const DEFAULT_THROTTLE: ThrottleOptions = {
	freeTries: 5,
	baseDelayMs: 2_000,
	maxDelayMs: 60_000,
	forgetAfterMs: 15 * 60_000,
	maxEntries: 1_000
};

interface Entry {
	failures: number;
	lastAt: number;
	blockedUntil: number;
}

export class LoginThrottle {
	private entries = new Map<string, Entry>();

	constructor(private options: ThrottleOptions = DEFAULT_THROTTLE) {}

	/** How long `key` must still wait before trying, in whole seconds (0 = may try now). */
	waitSeconds(key: string, now: number = Date.now()): number {
		const entry = this.current(key, now);
		if (!entry || entry.blockedUntil <= now) return 0;
		return Math.ceil((entry.blockedUntil - now) / 1000);
	}

	/** Record a wrong password for `key`. */
	failed(key: string, now: number = Date.now()): void {
		const entry = this.current(key, now) ?? { failures: 0, lastAt: now, blockedUntil: 0 };
		entry.failures += 1;
		entry.lastAt = now;
		const over = entry.failures - this.options.freeTries;
		if (over > 0) {
			const delay = Math.min(this.options.baseDelayMs * 2 ** (over - 1), this.options.maxDelayMs);
			entry.blockedUntil = now + delay;
		}
		this.entries.delete(key);
		this.entries.set(key, entry); // most recent last
		// Map order is insertion order, so the first key is the stalest.
		while (this.entries.size > this.options.maxEntries) {
			this.entries.delete(this.entries.keys().next().value!);
		}
	}

	/** Record a right password for `key`: it starts fresh. */
	succeeded(key: string): void {
		this.entries.delete(key);
	}

	private current(key: string, now: number): Entry | undefined {
		const entry = this.entries.get(key);
		if (entry && now - entry.lastAt > this.options.forgetAfterMs && entry.blockedUntil <= now) {
			this.entries.delete(key);
			return undefined;
		}
		return entry;
	}
}

/** The app's one throttle for the login form. */
export const loginThrottle = new LoginThrottle();
