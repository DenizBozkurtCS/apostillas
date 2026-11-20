/**
 * Serve a stored cover image from the data folder. Covers live under
 * `covers/<id>.jpg` in the configurable data folder (see paths.ts); a Book's
 * `coverPath` is `covers/<file>`, so the browser requests `/covers/<file>`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { dataDir } from '../../../lib/server/paths';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	// Reject anything but a bare file name to keep the read inside covers/.
	const name = path.basename(params.file);
	if (name !== params.file || !/^[\w.-]+$/.test(name)) throw error(404, 'Not found');

	const full = path.join(dataDir(), 'covers', name);
	if (!fs.existsSync(full)) throw error(404, 'Not found');

	const body = fs.readFileSync(full);
	return new Response(new Uint8Array(body), {
		headers: {
			'content-type': 'image/jpeg',
			'cache-control': 'private, max-age=3600'
		}
	});
};
