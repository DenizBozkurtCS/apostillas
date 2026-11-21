import { describe, it, expect } from 'vitest';
import { checkCover, detectCoverType, MAX_COVER_BYTES, storedCoverFile, trustedCoverUrl } from './covers';

const bytes = (...b: number[]) => new Uint8Array(b);

describe('detectCoverType', () => {
	it('recognises JPEG, PNG, GIF and WebP by their leading bytes', () => {
		expect(detectCoverType(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe('jpg');
		expect(detectCoverType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe('png');
		expect(detectCoverType(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))?.ext).toBe('gif');
		const webp = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
		expect(detectCoverType(webp)?.ext).toBe('webp');
	});

	it('rejects anything else', () => {
		expect(detectCoverType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
		expect(detectCoverType(bytes())).toBeNull();
	});
});

describe('checkCover', () => {
	it('refuses covers over the size limit', () => {
		const big = new Uint8Array(MAX_COVER_BYTES + 1);
		big.set([0xff, 0xd8, 0xff]);
		expect(checkCover(big)).toEqual({ ok: false, reason: 'too-large' });
	});
});

describe('storedCoverFile', () => {
	it('accepts a stored cover name and gives its content type', () => {
		expect(storedCoverFile('5.jpg')).toEqual({ name: '5.jpg', mime: 'image/jpeg' });
		expect(storedCoverFile('12.webp')).toEqual({ name: '12.webp', mime: 'image/webp' });
	});

	it('rejects dot entries, traversal and other names', () => {
		for (const name of ['.', '..', '../apostillas.db', '..\\x.jpg', 'apostillas.db', 'a.jpg', '5.svg', '5.jpg.html']) {
			expect(storedCoverFile(name)).toBeNull();
		}
	});
});

describe('trustedCoverUrl', () => {
	it('allows provider cover hosts and upgrades them to https', () => {
		expect(trustedCoverUrl('https://covers.openlibrary.org/b/id/8511741-L.jpg')).toBe(
			'https://covers.openlibrary.org/b/id/8511741-L.jpg'
		);
		expect(trustedCoverUrl('http://books.google.com/books/content?id=x&img=1')).toBe(
			'https://books.google.com/books/content?id=x&img=1'
		);
	});

	it('refuses other hosts, schemes, ports and credentials', () => {
		for (const url of [
			'http://localhost:5173/',
			'http://169.254.169.254/latest/meta-data',
			'file:///etc/passwd',
			'https://covers.openlibrary.org.evil.example/x.jpg',
			'https://covers.openlibrary.org:8080/x.jpg',
			'https://user@covers.openlibrary.org/x.jpg',
			'not a url'
		]) {
			expect(trustedCoverUrl(url)).toBeNull();
		}
	});
});
