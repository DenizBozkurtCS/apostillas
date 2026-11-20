import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { DB_FILENAME, dbPath } from './paths';

describe('dbPath', () => {
	it('places the SQLite file inside the data folder', () => {
		expect(dbPath('/tmp/example-data')).toBe(path.join(path.resolve('/tmp/example-data'), DB_FILENAME));
	});

	it('resolves a relative data folder to an absolute path', () => {
		const result = dbPath('./data');
		expect(path.isAbsolute(result)).toBe(true);
		expect(result).toBe(path.join(path.resolve('./data'), DB_FILENAME));
	});
});
