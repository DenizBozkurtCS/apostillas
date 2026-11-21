import { describe, it, expect } from 'vitest';
import { MAX_TAG_LENGTH, normalizeTag, tagError } from './tags';

describe('normalizeTag', () => {
	it('drops the # and lowercases', () => {
		expect(normalizeTag('#SciFi')).toBe('scifi');
		expect(normalizeTag('  ##From-Ana ')).toBe('from-ana');
		expect(normalizeTag('2024')).toBe('2024');
	});

	it('accepts letters beyond ASCII', () => {
		expect(normalizeTag('#Türkçe')).toBe('türkçe');
	});

	it('refuses empty, spaced, punctuated or overlong names', () => {
		expect(normalizeTag('#')).toBeNull();
		expect(normalizeTag('   ')).toBeNull();
		expect(normalizeTag('sci fi')).toBeNull();
		expect(normalizeTag('sci_fi')).toBeNull();
		expect(normalizeTag('a#b')).toBeNull();
		expect(normalizeTag('x'.repeat(MAX_TAG_LENGTH))).toBe('x'.repeat(MAX_TAG_LENGTH));
		expect(normalizeTag('x'.repeat(MAX_TAG_LENGTH + 1))).toBeNull();
	});
});

describe('tagError', () => {
	it('explains each refusal', () => {
		expect(tagError('#')).toBe('Type a Tag name.');
		expect(tagError('x'.repeat(MAX_TAG_LENGTH + 1))).toMatch(/at most/);
		expect(tagError('sci fi')).toMatch(/letters, numbers and -/);
	});
});
