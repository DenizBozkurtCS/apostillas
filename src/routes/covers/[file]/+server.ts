/**
 * Serve a stored cover image from the data folder. A Book's `coverPath` is
 * `covers/<bookId>.<ext>`, so the browser requests `/covers/<bookId>.<ext>`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { coversDir } from '#lib/server/paths';
import { storedCoverFile } from '#lib/server/covers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, request }) => {
	// Only a stored cover's own file name; keeps the read inside covers/.
	const file = storedCoverFile(params.file);
	if (!file) error(404, 'Not found');

	const full = path.join(coversDir(), file.name);
	let stat: fs.Stats;
	try {
		stat = fs.statSync(full);
	} catch {
		error(404, 'Not found');
	}
	if (!stat.isFile()) error(404, 'Not found');

	// A changed cover keeps its URL (covers/<bookId>.<ext>), so the browser
	// must revalidate every time; the ETag makes an unchanged cover a cheap 304.
	const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
	const headers = {
		'content-type': file.mime,
		'x-content-type-options': 'nosniff',
		'cache-control': 'private, no-cache',
		etag
	};
	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers });
	}

	let body: Buffer;
	try {
		body = fs.readFileSync(full);
	} catch {
		error(404, 'Not found');
	}
	return new Response(new Uint8Array(body), { headers });
};
