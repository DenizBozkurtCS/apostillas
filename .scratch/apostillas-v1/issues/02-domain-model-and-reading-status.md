# Domain model: Book, Read, Quote, Note, and derived Reading Status

Status: ready-for-agent
Blocked by: 01

Schema plus a pure domain module the rest of the app uses. Build test-first.

## Acceptance criteria

- Tables:
  - **Book**: title, authors, description, Open Library work ID (nullable), date added, "why / recommended by" (nullable), Edition fields (ISBN, page count, cover path; all nullable)
  - **Read**: start date (nullable), end date (nullable), outcome (open / finished / abandoned), rating 1–5 (nullable), "read before" flag
  - **Quote**: text, page/location (nullable), Read (nullable)
  - **Note**: Markdown body, Read (nullable)
  - Deleting a Book cascades to its Reads, Quotes, and Notes
- `readingStatus(reads)` implements ADR-0005 precedence. Tests cover: no Reads; one open; finished then open reread (→ Reading); finished then abandoned reread (→ Finished); abandoned only; abandoned then new open (→ Reading).
- `isReread(read, reads)` is true when an earlier Finished Read exists or the "read before" flag is set; an earlier Abandoned Read alone does not count.
- `canAnnotate(status)` is false only for Want to read.
- Operations with tests: start (refused if a Read is already open), finish, abandon, log a past Finished Read, revert to Want to read (deletes the open Read, keeps Quotes and Notes).
