# Tags on Books

Status: closed
Blocked by: 01

Let the reader group Books with Tags (see **Tag** in `GLOSSARY.md`).

## Acceptance criteria

- A Book can carry many Tags; a Tag can be on many Books.
- Tag names are case-insensitive (`#SciFi` and `#scifi` are the same Tag), made of letters, numbers and `-`. The `#` is typing syntax, not part of the name.
- On the Book page header, the Book's Tags show as chips under the title. A **+ tag** input suggests existing Tags as you type; Enter adds one; × on a chip removes it.
- A Tag that no Book carries any more disappears (it is not offered as a suggestion).
- Deleting a Book removes its Tags from it.
- No rename or Tag-management page.
- Back up `data/` before running the migration.

## Comments

**RALPH (2026-11-21):** Done: Tags on Books
