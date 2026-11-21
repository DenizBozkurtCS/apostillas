# Reading Statuses you set; remove Abandoned; reset the library

Status: closed
Blocked by: —

See ADR-0006 and **Reading Status** / **Rating** in `GLOSSARY.md`.

## Acceptance criteria

- Back up `data/`, then reset to an empty library (Books, Notes, Quotes, Tags, Shelves). Trial the migration on a copy first; give it a journal `when` after the previous one.
- Schema: Books store each Reading Status as on/off with the moment it was switched on, and a Rating. Reads are replaced by an `impressions` table (Book, date, rating, review, reread, didn't finish); Quote/Note search keeps working.
- Book page: the Add page's icon buttons (Bookstack, Reading, Read it) plus ½–5 stars. Each icon toggles its status; on = accent colour. A star sets the Rating and switches Finished on. Clear rating. No dates recorded. The old Start / Finish / Abandon / Log past read controls go.
- Add page: adding as Reading or Read it (with or without a star) sets statuses and Rating only; no dates.
- Abandoned removed everywhere; `/abandoned` redirects to `/reading`. The Library menu has Reading, Bookstack, Books.
- Lists: a Book appears on every list whose status it has. Reading sorts by when Reading was switched on; Books by when Finished was switched on; Rating sort/filter use the Book's Rating. No ↻ on tiles. The year filter on Books uses Impression dates (works once 02 can create them).
- Notes and Quotes can be added to any Book.
- Shelf tiles show stars for any rated Book.

## Comments

**RALPH (2026-11-21):** Built and pushed.
