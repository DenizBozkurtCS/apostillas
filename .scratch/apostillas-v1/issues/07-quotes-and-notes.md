# Quotes and Notes on the Book page

Status: closed
Blocked by: 06

## Acceptance criteria

- Add, edit, and delete Quotes (text, optional page/location) and Notes (Markdown, rendered with HTML sanitised)
- Each can optionally be linked to one of the Book's Reads; defaults to the open Read if there is one
- Adding is disabled, with an explanation, when the Book is Want to read; existing Quotes and Notes still display
- Separate Quotes and Notes sections on the Book page, newest first

## Comments

**RALPH (2026-11-21):** Added Quotes and Notes to the Book page: CRUD scoped to the Book, optional link to one of the Book's Reads (defaults to the open Read), adding gated to non-Want-to-read Books with existing annotations still shown, separate newest-first sections. Notes are Markdown rendered to sanitised HTML.
