import fs from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { dataDir, dbPath } from '../paths';
import * as schema from './schema';

const folder = dataDir();
fs.mkdirSync(folder, { recursive: true });

const sqlite = new Database(dbPath(process.env.DATA_DIR ?? './data'));
sqlite.pragma('journal_mode = WAL');
// Enforce the Book → Reads/Quotes/Notes cascade and Read → annotation unlink.
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
