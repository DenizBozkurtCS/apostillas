import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { dbPath, ensureDataDir } from '../paths';
import * as schema from './schema';

const sqlite = new Database(dbPath(ensureDataDir()));
sqlite.pragma('journal_mode = WAL');
// Enforce the cascades: Book → Impressions/Quotes/Notes/Tags/Shelf entries, Shelf → entries.
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
