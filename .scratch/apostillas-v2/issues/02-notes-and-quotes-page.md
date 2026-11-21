# Notes & Quotes page and the Markdown editor

Status: closed
Blocked by: 01

One page in the navbar for everything you have written, plus a real Markdown editor for Notes.

## Acceptance criteria

### Page

- Navbar item **Notes & Quotes** replaces Search, linking to `/notes`. `/search` permanently redirects to `/notes`.
- Two columns: a wider **Notes** column and a **Quotes** column, each newest first. Each card shows the text, the Book's title and a small cover, and links to the Book.
- Each column shows the latest 10, with **See all Notes (n)** / **See all Quotes (n)** at its foot. That opens a full-width view of just that kind with "← Back to Notes & Quotes".
- On phones, a **Notes | Quotes** switch shows one column at a time (Notes first). The limit and "See all" work the same.
- Long Notes are cut to about 6 lines with "Show more".
- Edit and Delete work in place on each card (Delete asks first).

### Search

- One search box at the top filters both columns as you type (after a short pause), with matches highlighted as today.
- While searching, the 10-item limit is off and every match shows.
- The address stays `/notes`: the search is not put in the URL.

### Writing

- **+ New Note** and **+ New Quote** buttons, one per column. Each first asks which Book, offering only Books that can be annotated (Reading, Finished, Abandoned; not Bookstack). The linked Read then defaults to the Book's latest Read, as on the Book page.

### Editor

- Notes are written in **EasyMDE**, everywhere a Note is added or edited (this page and the Book page).
- The toolbar offers only what the renderer supports: headings, bold, italic, bulleted and numbered lists, quote, code, link.
- The preview uses `src/lib/markdown.ts`, so it matches the saved Note. It sits side by side on wide screens and is a toggle on phones.
- Quotes keep a plain text box.
- The editor follows light and dark mode and the app's accent.

## Comments

**RALPH (2026-11-21):** Done: Notes & Quotes page, live search, EasyMDE editor
