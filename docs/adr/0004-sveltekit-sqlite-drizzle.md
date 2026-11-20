# SvelteKit, SQLite, and Drizzle in one process

The app is a single SvelteKit (TypeScript) process with a SQLite file accessed through Drizzle. One process and one data file fit a single-user, local-first app (ADR-0001) and deploy to a cheap host unchanged. Next.js was rejected as more framework than a small app needs; Postgres was rejected as an extra service to run for one reader's data.
