/**
 * Cover images: the one place that decides which images we accept, where they
 * are stored, and which hosts we will download them from. Covers are stored as
 * `covers/<bookId>.<ext>` inside the data folder, so a backup is a folder copy
 * (ADR-0003).
 */

import fs from 'node:fs';
import path from 'node:path';
import { COVERS_DIRNAME } from './paths';
import type { FetchLike } from './booksearch';

/** Largest cover we store, uploaded or downloaded. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;

/** An image format we accept as a cover. */
export interface CoverImageType {
	ext: 'jpg' | 'png' | 'gif' | 'webp';
	mime: string;
}

const JPEG: CoverImageType = { ext: 'jpg', mime: 'image/jpeg' };
const PNG: CoverImageType = { ext: 'png', mime: 'image/png' };
const GIF: CoverImageType = { ext: 'gif', mime: 'image/gif' };
const WEBP: CoverImageType = { ext: 'webp', mime: 'image/webp' };
const BY_EXT = new Map([JPEG, PNG, GIF, WEBP].map((t) => [t.ext as string, t]));

function startsWith(bytes: Uint8Array, magic: number[], offset = 0): boolean {
	return magic.every((b, i) => bytes[offset + i] === b);
}

/** Identify a cover image by its leading bytes; null when it isn't one we accept. */
export function detectCoverType(bytes: Uint8Array): CoverImageType | null {
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) return JPEG;
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return PNG;
	if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return GIF;
	if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
		return WEBP;
	}
	return null;
}

/** Check uploaded or downloaded bytes; returns the image type, or why they were refused. */
export function checkCover(
	bytes: Uint8Array
): { ok: true; type: CoverImageType } | { ok: false; reason: 'too-large' | 'not-an-image' } {
	if (bytes.length > MAX_COVER_BYTES) return { ok: false, reason: 'too-large' };
	const type = detectCoverType(bytes);
	return type ? { ok: true, type } : { ok: false, reason: 'not-an-image' };
}

/**
 * A stored cover's file name (`<bookId>.<ext>`), validated, with its content
 * type — or null for anything that isn't one. Rejects `.`, `..`, separators.
 */
export function storedCoverFile(name: string): { name: string; mime: string } | null {
	const match = /^\d+\.(jpg|png|gif|webp)$/.exec(name);
	if (!match) return null;
	return { name, mime: BY_EXT.get(match[1])!.mime };
}

/** Hosts the search providers serve cover images from. */
const COVER_HOSTS = new Set([
	'covers.openlibrary.org',
	'books.google.com',
	'books.googleusercontent.com'
]);

/**
 * The cover URL to download, upgraded to https, if it points at a provider's
 * cover host; otherwise null. The URL arrives from the browser in a hidden
 * form field, so it must not let the server be pointed at arbitrary hosts.
 */
export function trustedCoverUrl(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	if (!COVER_HOSTS.has(url.hostname) || url.port !== '' || url.username !== '') return null;
	url.protocol = 'https:';
	return url.toString();
}

/**
 * Store cover bytes for a Book and return the path relative to the data folder
 * (e.g. `covers/5.png`) to record on the Book, or null if the bytes aren't an
 * acceptable image.
 */
export function writeCover(coversDir: string, bookId: number, bytes: Uint8Array): string | null {
	const checked = checkCover(bytes);
	if (!checked.ok) return null;
	fs.mkdirSync(coversDir, { recursive: true });
	const fileName = `${bookId}.${checked.type.ext}`;
	fs.writeFileSync(path.join(coversDir, fileName), bytes);
	return path.posix.join(COVERS_DIRNAME, fileName);
}

/**
 * Download a cover from a provider's cover host and store it. Returns the
 * stored path, or null if the URL isn't trusted or the download failed —
 * covers are best-effort, not required.
 */
export async function downloadCover(
	coversDir: string,
	bookId: number,
	coverUrl: string,
	fetchImpl: FetchLike = fetch
): Promise<string | null> {
	const url = trustedCoverUrl(coverUrl);
	if (!url) return null;
	try {
		const res = await fetchImpl(url);
		if (!res.ok) return null;
		const length = Number(res.headers.get('content-length'));
		if (length > MAX_COVER_BYTES) return null;
		return writeCover(coversDir, bookId, new Uint8Array(await res.arrayBuffer()));
	} catch {
		return null;
	}
}
