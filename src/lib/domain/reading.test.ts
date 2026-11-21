import { describe, it, expect } from 'vitest';
import { isValidRating, NO_STATUSES, parseStatusKey, switchStatus } from './reading';

describe('switchStatus', () => {
	it('switches one status on at the given moment, leaving the others', () => {
		const s = switchStatus({ ...NO_STATUSES, want: 'a' }, 'reading', true, 'b');
		expect(s).toEqual({ want: 'a', reading: 'b', finished: null });
	});

	it('keeps the original moment of a status that is already on', () => {
		expect(switchStatus({ ...NO_STATUSES, finished: 'a' }, 'finished', true, 'b').finished).toBe('a');
	});

	it('switches a status off', () => {
		expect(switchStatus({ want: 'a', reading: 'a', finished: 'a' }, 'want', false, 'b')).toEqual({
			want: null,
			reading: 'a',
			finished: 'a'
		});
	});
});

describe('parseStatusKey', () => {
	it('accepts the three status keys only', () => {
		expect(['want', 'reading', 'finished'].map(parseStatusKey)).toEqual(['want', 'reading', 'finished']);
		expect(parseStatusKey('abandoned')).toBeNull();
		expect(parseStatusKey(null)).toBeNull();
	});
});

describe('isValidRating', () => {
	it('accepts ½ to 5 in half steps', () => {
		expect([0.5, 1, 3.5, 5].every(isValidRating)).toBe(true);
		expect([0, 4.3, 5.5, -1].some(isValidRating)).toBe(false);
	});
});
