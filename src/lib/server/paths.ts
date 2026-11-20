import path from 'node:path';

/** Name of the SQLite file that holds all of a reader's data. */
export const DB_FILENAME = 'apostillas.db';

/**
 * The absolute path to the SQLite file inside a given data folder.
 * The data folder (SQLite file + covers) is configurable so that a
 * backup is just a copy of the folder.
 */
export function dbPath(dataDir: string): string {
	return path.join(path.resolve(dataDir), DB_FILENAME);
}

/**
 * The data folder location, from the `DATA_DIR` env var, defaulting to
 * `./data`.
 */
export function dataDir(): string {
	return path.resolve(process.env.DATA_DIR ?? './data');
}
