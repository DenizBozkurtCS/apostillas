# Full-text search across Quotes and Notes

Status: ready-for-agent
Blocked by: 07

## Acceptance criteria

- Search screen with a single query box
- Backed by SQLite FTS5, kept in sync when Quotes and Notes are created, edited, or deleted
- Results show the matching snippet, whether it is a Quote or a Note, and the Book; each links to the Book page
