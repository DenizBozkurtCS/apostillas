import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { dbPath, ensureDataDir } from '../src/lib/server/paths.ts';

// Ensure the data folder (SQLite file + covers) exists before opening the DB,
// the same way the runtime client does, then apply all pending migrations.
// The migrations folder is resolved from this file, so the script works from
// any working directory.
const file = dbPath(ensureDataDir());
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const sqlite = new Database(file);
migrate(drizzle(sqlite), { migrationsFolder });
sqlite.close();

console.log(`Migrations applied to ${file}`);
