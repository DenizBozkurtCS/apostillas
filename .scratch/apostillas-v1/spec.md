# apostillas v1

A personal book tracker for one reader. Vocabulary is defined in `GLOSSARY.md`; architectural decisions in `docs/adr/0001`–`0005`. Use glossary terms exactly.

## Scope

- Add a **Book** by searching Open Library (Google Books fallback) by title, author, or ISBN; metadata and cover are copied into our store (ADR-0003). Manual entry when nothing is found. Adding a Book that already exists opens the existing one.
- A Book is the work; **Edition** details (ISBN, cover, page count) are optional attributes (ADR-0002).
- **Reads**: starting a Book opens a Read (start date = today); it closes as Finished or Abandoned with an end date. Dates are editable. Past Reads can be logged directly as Finished with no start date. Optional 1–5 rating per Read. A Read is a **Reread** if the Book has an earlier Finished Read, or if the reader ticks "I've read this before".
- **Reading Status** is derived, never stored (ADR-0005): open Read → Reading; else any Finished → Finished; else any Abandoned → Abandoned; no Reads → Want to read. Moving a Reading Book back to Want to read deletes its open Read. Resuming an Abandoned Book opens a new Read.
- **Want to read** Books record date added and an optional free-text "why / recommended by". No manual ordering.
- **Quotes** (verbatim text, optional page/location) and **Notes** (Markdown) belong to a Book, optionally linked to one Read. They cannot be added while the Book is Want to read; existing ones are kept if a Book returns to Want to read.
- Deleting a Book (after confirmation) deletes its Reads, Quotes, and Notes.
- Metadata on a Book is editable.

## Screens

- Four lists: **Reading** (home), Want to read, Finished (newest finish first, reread icon), Abandoned
- **Book page**: metadata, Reads, Quotes, Notes
- **Add book**: search and pick, or manual entry
- **Search**: full-text across Quotes and Notes

## Platform

SvelteKit + TypeScript, SQLite via Drizzle, single process (ADR-0004). Data folder (SQLite file + covers) location is configurable; backup = copy the folder. If an `APP_PASSWORD` env var is set, the whole app requires that password; otherwise it is open (ADR-0001).

## Out of scope for v1

Multi-user, tags/shelves, reading progress, import, export, automatic metadata refresh.

## Issues

| # | Issue | Blocked by |
|---|-------|------------|
| 01 | Scaffold SvelteKit + SQLite + Drizzle | — |
| 02 | Domain model and derived Reading Status | 01 |
| 03 | Add book from Open Library | 02 |
| 04 | Manual book entry | 03 |
| 05 | Status lists | 02 |
| 06 | Book page and Reads | 05 |
| 07 | Quotes and Notes | 06 |
| 08 | Search Quotes and Notes | 07 |
| 09 | Password gate | 01 |
