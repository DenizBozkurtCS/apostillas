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

export const GET: RequestHandler = ({ params }) => {
	// Only a stored cover's own file name; keeps the read inside covers/.
	const file = storedCoverFile(params.file);
	if (!file) error(404, 'Not found');

	const full = path.join(coversDir(), file.name);
	let body: Buffer;
	try {
		if (!fs.statSync(full).isFile()) error(404, 'Not found');
		body = fs.readFileSync(full);
	} catch {
		error(404, 'Not found');
	}

	return new Response(new Uint8Array(body), {
		headers: {
			'content-type': file.mime,
			'x-content-type-options': 'nosniff',
			'cache-control': 'private, max-age=3600'
		}
	});
};
