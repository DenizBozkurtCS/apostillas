import fs from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { dataDir, dbPath } from '../src/lib/server/paths.ts';

// Ensure the data folder (SQLite file + covers) exists before opening the DB,
// the same way the runtime client does, then apply all pending migrations.
const folder = dataDir();
fs.mkdirSync(folder, { recursive: true });

const sqlite = new Database(dbPath(process.env.DATA_DIR ?? './data'));
migrate(drizzle(sqlite), { migrationsFolder: './drizzle' });
sqlite.close();

console.log(`Migrations applied to ${dbPath(process.env.DATA_DIR ?? './data')}`);
