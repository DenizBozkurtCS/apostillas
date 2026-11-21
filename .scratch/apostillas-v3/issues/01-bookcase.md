# Shelves and the Bookcase page

Status: ready-for-human
Blocked by: —

Create Shelves and see them all on the Bookcase (see **Shelf** and **Bookcase** in `GLOSSARY.md`).

## Acceptance criteria

- A **Bookcase** item in the navbar between Library and Notes & Quotes opens `/bookcase`.
- **+ New Shelf** asks for a name (and an optional description) and adds the Shelf at the top of the Bookcase.
- Each Shelf is a row: its name and Book count, then one line of the covers that fit the screen width (no sideways scrolling). "See all (n) →" opens the Shelf's page; when every cover fits it reads "Open →".
- Each row has a ⋯ menu: **Rename**, **Move up**, **Move down**, **Delete** (confirms; the Books stay in the library).
- Names: required; the slug (lowercase, spaces to `-`, punctuation dropped, accented letters kept) must be unique and non-empty, with a clear message otherwise.
- An empty Bookcase says so and offers + New Shelf. An empty Shelf row says "No books yet" with a link to its page.
- `/bookcase/<slug>` exists (fully built in 02); an unknown slug shows "Shelf not found" with a link to the Bookcase.
- Back up `data/` before running the migration, and trial it on a copy first. Give the migration a journal `when` after the previous one.

## Comments
