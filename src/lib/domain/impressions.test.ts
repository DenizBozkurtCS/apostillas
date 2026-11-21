import { describe, it, expect } from 'vitest';
import { checkImpression, isIsoDay, MAX_REVIEW, newestFirst } from './impressions';

const base = { date: '2026-11-21', rating: null, review: null, reread: false, didNotFinish: false };

describe('checkImpression', () => {
	it('accepts a date alone', () => {
		expect(checkImpression(base)).toEqual({ ok: true, input: base });
	});

	it('requires a real date', () => {
		expect(checkImpression({ ...base, date: '' })).toMatchObject({ ok: false });
		expect(checkImpression({ ...base, date: null })).toMatchObject({ ok: false });
		expect(checkImpression({ ...base, date: '2026-02-30' })).toMatchObject({ ok: false });
	});

	it('checks the rating', () => {
		expect(checkImpression({ ...base, rating: 3.5 })).toMatchObject({ ok: true, input: { rating: 3.5 } });
		expect(checkImpression({ ...base, rating: 3.3 })).toMatchObject({ ok: false });
	});

	it('trims the review, treats blank as none, and caps its length', () => {
		expect(checkImpression({ ...base, review: '  Loved it\r\nTruly.  ' })).toMatchObject({
			ok: true,
			input: { review: 'Loved it\nTruly.' }
		});
		expect(checkImpression({ ...base, review: '   ' })).toMatchObject({ ok: true, input: { review: null } });
		expect(checkImpression({ ...base, review: 'x'.repeat(MAX_REVIEW) }).ok).toBe(true);
		expect(checkImpression({ ...base, review: 'x'.repeat(MAX_REVIEW + 1) })).toMatchObject({ ok: false });
	});

	it('keeps the markers', () => {
		expect(checkImpression({ ...base, reread: true, didNotFinish: true })).toMatchObject({
			input: { reread: true, didNotFinish: true }
		});
	});
});

describe('isIsoDay', () => {
	it('accepts only real YYYY-MM-DD days', () => {
		expect(isIsoDay('2024-02-29')).toBe(true);
		expect(isIsoDay('2025-02-29')).toBe(false);
		expect(isIsoDay('21/11/2026')).toBe(false);
	});
});

describe('newestFirst', () => {
	it('orders by date, then most recently saved', () => {
		const items = [
			{ id: 1, date: '2025-01-01' },
			{ id: 2, date: '2026-01-01' },
			{ id: 3, date: '2025-01-01' }
		];
		expect(newestFirst(items).map((i) => i.id)).toEqual([2, 3, 1]);
	});
});
