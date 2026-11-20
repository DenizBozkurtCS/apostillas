import { defineConfig } from 'drizzle-kit';
import { dbPath } from './src/lib/server/paths';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: dbPath(process.env.DATA_DIR ?? './data')
	}
});
