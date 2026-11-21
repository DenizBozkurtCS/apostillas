# apostillas v3: Shelves and the Bookcase

Builds on v2 (`.scratch/apostillas-v2/spec.md`). Vocabulary is in `GLOSSARY.md` (see **Shelf** and **Bookcase**); use glossary terms exactly. Agreed in a grilling session on 2026-11-21.

## Goals

- Let the reader make their own named, hand-arranged collections of Books (**Shelves**) and see them all on one page (the **Bookcase**).

## Decisions

- Navbar: Library ▾ · **Bookcase** · Notes & Quotes. The Bookcase lives at `/bookcase`.
- A Shelf holds any Book in the library, whatever its Reading Status; a Book can be on many Shelves. Removing a Book from a Shelf or deleting the Shelf never deletes the Book. A Shelf exists even when empty.
- A Shelf has a name (required) and an optional description. The description shows only on the Shelf's own page.
- **Addresses follow the name**: `/bookcase/<slug>`. The slug is the name lowercased, spaces to `-`, punctuation dropped, letters such as ç and ü kept (as with Tags). Two names with the same slug can't both exist ("You already have a Shelf called …"); a name with no letters or numbers is refused. Renaming moves the Shelf to its new address (and takes you there); old addresses are not redirected and show "Shelf not found" with a link to the Bookcase.
- **Bookcase order** is set by hand (Move up / Move down); new Shelves go at the top.
- **Order within a Shelf** is set by hand (Arrange mode: drag, plus move buttons for phones and keyboard); new Books go at the end.
- **Bookcase rows** don't scroll sideways: each shows one line of the covers that fit, and "See all (n) →" (or "Open →" when all fit) opens the Shelf's page.
- Tiles match the Library lists: cover only, title and author on hover and for screen readers, stars under rated Finished Books.
- The Book page does **not** show which Shelves a Book is on; it only offers "Add to Shelf…" in its ⋯ menu.
- Shelves and Tags stay separate.

## Out of scope

Redirects from old Shelf names, sort or filter inside a Shelf, linking Shelves to Tags, sharing Shelves, showing a Book's Shelves on its page.

## Issues (build in this order)

| # | Issue | Blocked by |
|---|-------|------------|
| 01 | Shelves and the Bookcase page | — |
| 02 | A Shelf's page: adding, removing and arranging Books | 01 |
| 03 | "Add to Shelf…" on the Book page | 01 |
