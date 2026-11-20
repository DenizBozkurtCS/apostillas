# Scaffold SvelteKit app with SQLite and Drizzle

Status: ready-for-agent

Set up the project per ADR-0004.

## Acceptance criteria

- SvelteKit + TypeScript app runs with `npm run dev`
- Drizzle configured against a SQLite file inside a data folder; folder path from a `DATA_DIR` env var, defaulting to `./data` (gitignored)
- Migrations generated with drizzle-kit and applied via an npm script
- Vitest set up with one passing test; `npm run test` runs it
- `npm run typecheck` runs `svelte-check` with no errors
- Keep the existing `@ai-hero/sandcastle` dev dependency and the `.sandcastle/` folder
- `.gitignore` covers `node_modules`, build output, and the data folder
