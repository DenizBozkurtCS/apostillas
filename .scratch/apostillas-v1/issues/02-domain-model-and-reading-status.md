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
- `isReread(read, reads)` is true when an earlier Finished Read exists or the "read before" flag is set; an earlier Abandoned Read alone does not count. "Earlier" is by date (start date, or end date for a logged past Read with no start), ties broken by creation order, so logging an older Read makes later Reads Rereads retroactively.
- Reverting to Want to read or deleting a Read unlinks that Read's Quotes and Notes (they stay on the Book).
- `statusAfterDeleting(read, reads)` (or equivalent) lets the UI warn when deleting a Read would change the Reading Status.
- `canAnnotate(status)` is false only for Want to read.
- Operations with tests: start (refused if a Read is already open), finish, abandon, log a past Finished Read, revert to Want to read (deletes the open Read, keeps Quotes and Notes).

## Comments

**Prototype (2026-11-20):** The Reading Status and Reread rules were exercised in a throwaway single-file demo, `.scratch/apostillas-v1/prototypes/reading-status.prototype.html` on branch `prototype/reading-status` (commit `cd57716`). Its `ReadingModel` script block is a pure module meant to be lifted into this issue's domain code. Verdicts:
- Logging an older Read retroactively turns later Reads into Rereads: **accepted**.
- Moving a Reading Book back to Want to read unlinks Quotes/Notes from the deleted Read: **accepted**.
- Deleting the only Finished Read drops the Book to Want to read while it keeps Quotes/Notes: **allowed, but with a warning** (see issue 06).
