import { describe, it, expect } from 'vitest';
import {
	abandon,
	canAnnotate,
	finish,
	isReread,
	logPastFinished,
	openRead,
	readingStatus,
	revertToWantToRead,
	start,
	statusAfterDeleting,
	type Outcome,
	type Read
} from './reading';

/** Build a Read with sensible defaults; override what the test cares about. */
function read(partial: Partial<Read> & { id: number; outcome: Outcome }): Read {
	return { startDate: null, endDate: null, rating: null, readBefore: false, ...partial };
}

const TODAY = '2026-11-20';

describe('readingStatus', () => {
	it('is Want to read with no Reads', () => {
		expect(readingStatus([])).toBe('Want to read');
	});

	it('is Reading while a Read is open', () => {
		expect(readingStatus([read({ id: 1, outcome: 'open', startDate: TODAY })])).toBe('Reading');
	});

	it('is Reading for a finished Book with an open reread', () => {
		const reads = [
			read({ id: 1, outcome: 'finished', endDate: '2025-01-01' }),
			read({ id: 2, outcome: 'open', startDate: '2026-01-01' })
		];
		expect(readingStatus(reads)).toBe('Reading');
	});

	it('stays Finished when a later reread was abandoned', () => {
		const reads = [
			read({ id: 1, outcome: 'finished', endDate: '2025-01-01' }),
			read({ id: 2, outcome: 'abandoned', startDate: '2026-01-01', endDate: '2026-02-01' })
		];
		expect(readingStatus(reads)).toBe('Finished');
	});

	it('is Abandoned when the only Read was abandoned', () => {
		expect(
			readingStatus([read({ id: 1, outcome: 'abandoned', startDate: '2025-01-01' })])
		).toBe('Abandoned');
	});

	it('is Reading when an abandoned Book is resumed', () => {
		const reads = [
			read({ id: 1, outcome: 'abandoned', startDate: '2025-01-01', endDate: '2025-02-01' }),
			read({ id: 2, outcome: 'open', startDate: '2026-01-01' })
		];
		expect(readingStatus(reads)).toBe('Reading');
	});
});

describe('isReread', () => {
	it('is false for a first Read', () => {
		const r = read({ id: 1, outcome: 'open', startDate: TODAY });
		expect(isReread(r, [r])).toBe(false);
	});

	it('is true when an earlier Finished Read exists', () => {
		const earlier = read({ id: 1, outcome: 'finished', endDate: '2024-01-01' });
		const later = read({ id: 2, outcome: 'open', startDate: '2026-01-01' });
		expect(isReread(later, [earlier, later])).toBe(true);
		expect(isReread(earlier, [earlier, later])).toBe(false);
	});

	it('is false when the only earlier Read was abandoned', () => {
		const earlier = read({ id: 1, outcome: 'abandoned', startDate: '2024-01-01', endDate: '2024-02-01' });
		const later = read({ id: 2, outcome: 'open', startDate: '2026-01-01' });
		expect(isReread(later, [earlier, later])).toBe(false);
	});

	it('is true for a lone Read when "read before" is ticked', () => {
		const r = read({ id: 1, outcome: 'finished', endDate: TODAY, readBefore: true });
		expect(isReread(r, [r])).toBe(true);
	});

	it('turns a later Read into a Reread when an older Read is logged after it', () => {
		const current = read({ id: 1, outcome: 'finished', startDate: '2026-01-01', endDate: '2026-02-01' });
		// Not a reread on its own.
		expect(isReread(current, [current])).toBe(false);
		// Log a Read finished years earlier (higher id, earlier date).
		const past = read({ id: 2, outcome: 'finished', endDate: '2020-01-01' });
		const reads = [current, past];
		expect(isReread(current, reads)).toBe(true);
		expect(isReread(past, reads)).toBe(false);
	});

	it('breaks same-date ties by creation order', () => {
		const first = read({ id: 1, outcome: 'finished', endDate: TODAY });
		const second = read({ id: 2, outcome: 'finished', endDate: TODAY });
		expect(isReread(second, [first, second])).toBe(true);
		expect(isReread(first, [first, second])).toBe(false);
	});
});

describe('statusAfterDeleting', () => {
	it('drops to Want to read when the only Finished Read is deleted', () => {
		const only = read({ id: 1, outcome: 'finished', endDate: TODAY });
		expect(statusAfterDeleting(only, [only])).toBe('Want to read');
	});

	it('falls back to Finished when the open Read is deleted', () => {
		const finished = read({ id: 1, outcome: 'finished', endDate: '2025-01-01' });
		const open = read({ id: 2, outcome: 'open', startDate: '2026-01-01' });
		expect(statusAfterDeleting(open, [finished, open])).toBe('Finished');
	});
});

describe('canAnnotate', () => {
	it('is false only for Want to read', () => {
		expect(canAnnotate('Want to read')).toBe(false);
		expect(canAnnotate('Reading')).toBe(true);
		expect(canAnnotate('Finished')).toBe(true);
		expect(canAnnotate('Abandoned')).toBe(true);
	});
});

describe('start', () => {
	it('opens a Read dated today when the Book has none', () => {
		const result = start([], TODAY);
		expect(result).toEqual({
			ok: true,
			mutation: {
				kind: 'insert',
				read: { startDate: TODAY, endDate: null, outcome: 'open', rating: null, readBefore: false }
			}
		});
	});

	it('is refused when a Read is already open', () => {
		const result = start([read({ id: 1, outcome: 'open', startDate: TODAY })], TODAY);
		expect(result.ok).toBe(false);
	});

	it('opens a fresh Read when resuming an abandoned Book', () => {
		const reads = [read({ id: 1, outcome: 'abandoned', startDate: '2025-01-01', endDate: '2025-02-01' })];
		const result = start(reads, TODAY);
		expect(result.ok).toBe(true);
	});
});

describe('finish', () => {
	it('closes the open Read with today as the end date', () => {
		const reads = [read({ id: 7, outcome: 'open', startDate: '2026-01-01' })];
		const result = finish(reads, TODAY, { rating: 5 });
		expect(result).toEqual({
			ok: true,
			mutation: {
				kind: 'update',
				id: 7,
				patch: { outcome: 'finished', endDate: TODAY, rating: 5, readBefore: false }
			}
		});
	});

	it('is refused when no Read is open', () => {
		expect(finish([], TODAY).ok).toBe(false);
	});

	it('rejects a rating outside 1–5', () => {
		const reads = [read({ id: 1, outcome: 'open', startDate: TODAY })];
		expect(finish(reads, TODAY, { rating: 6 }).ok).toBe(false);
		expect(finish(reads, TODAY, { rating: 0 }).ok).toBe(false);
		expect(finish(reads, TODAY, { rating: 2.5 }).ok).toBe(false);
	});

	it('carries the "read before" flag through', () => {
		const reads = [read({ id: 1, outcome: 'open', startDate: TODAY })];
		const result = finish(reads, TODAY, { readBefore: true });
		expect(result.ok && result.mutation.kind === 'update' && result.mutation.patch.readBefore).toBe(
			true
		);
	});
});

describe('abandon', () => {
	it('closes the open Read as abandoned', () => {
		const reads = [read({ id: 3, outcome: 'open', startDate: '2026-01-01' })];
		const result = abandon(reads, TODAY);
		expect(result).toEqual({
			ok: true,
			mutation: {
				kind: 'update',
				id: 3,
				patch: { outcome: 'abandoned', endDate: TODAY, rating: null, readBefore: false }
			}
		});
	});

	it('is refused when no Read is open', () => {
		expect(abandon([], TODAY).ok).toBe(false);
	});
});

describe('logPastFinished', () => {
	it('inserts a Finished Read with no start date', () => {
		const result = logPastFinished([], { endDate: '2020-06-01', rating: 4 });
		expect(result).toEqual({
			ok: true,
			mutation: {
				kind: 'insert',
				read: {
					startDate: null,
					endDate: '2020-06-01',
					outcome: 'finished',
					rating: 4,
					readBefore: false
				}
			}
		});
	});

	it('does not require the Book to have an open Read', () => {
		const reads = [read({ id: 1, outcome: 'open', startDate: TODAY })];
		expect(logPastFinished(reads, { endDate: '2019-01-01' }).ok).toBe(true);
	});

	it('rejects an out-of-range rating', () => {
		expect(logPastFinished([], { endDate: '2019-01-01', rating: 9 }).ok).toBe(false);
	});
});

describe('revertToWantToRead', () => {
	it('deletes the open Read and unlinks its annotations', () => {
		const reads = [read({ id: 5, outcome: 'open', startDate: TODAY })];
		const result = revertToWantToRead(reads);
		expect(result).toEqual({
			ok: true,
			mutation: { kind: 'delete', id: 5, unlinkReadId: 5 }
		});
	});

	it('is refused when the Book is not Reading', () => {
		const reads = [read({ id: 1, outcome: 'finished', endDate: TODAY })];
		expect(revertToWantToRead(reads).ok).toBe(false);
	});
});

describe('openRead', () => {
	it('returns the open Read or null', () => {
		expect(openRead([])).toBeNull();
		const open = read({ id: 1, outcome: 'open', startDate: TODAY });
		expect(openRead([open])).toBe(open);
	});
});
