import fs from 'node:fs';
import path from 'node:path';

/** Name of the SQLite file that holds all of a reader's data. */
export const DB_FILENAME = 'apostillas.db';

/** Name of the folder, inside the data folder, that holds cover images. */
export const COVERS_DIRNAME = 'covers';

/**
 * The data folder location, from the `DATA_DIR` env var, defaulting to
 * `./data`. The data folder (SQLite file + covers) is configurable so that a
 * backup is just a copy of the folder.
 */
export function dataDir(): string {
	return path.resolve(process.env.DATA_DIR ?? './data');
}

/** Create the data folder if it is missing and return its absolute path. */
export function ensureDataDir(): string {
	const folder = dataDir();
	fs.mkdirSync(folder, { recursive: true });
	return folder;
}

/** The absolute path to the SQLite file inside a data folder (default: {@link dataDir}). */
export function dbPath(folder: string = dataDir()): string {
	return path.join(path.resolve(folder), DB_FILENAME);
}

/** The absolute path to the covers folder inside a data folder (default: {@link dataDir}). */
export function coversDir(folder: string = dataDir()): string {
	return path.join(path.resolve(folder), COVERS_DIRNAME);
}
