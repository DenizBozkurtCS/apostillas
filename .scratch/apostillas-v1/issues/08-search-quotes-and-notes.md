# Full-text search across Quotes and Notes

Status: closed
Blocked by: 07

## Acceptance criteria

- Search screen with a single query box
- Backed by SQLite FTS5, kept in sync when Quotes and Notes are created, edited, or deleted
- Results show the matching snippet, whether it is a Quote or a Note, and the Book; each links to the Book page

## Comments

**RALPH (2026-11-21):** Added full-text search across Quotes and Notes backed by a single SQLite FTS5 index kept in sync by triggers; new /search screen with a query box showing marked snippets, kind, and Book, each linking to the Book page.
