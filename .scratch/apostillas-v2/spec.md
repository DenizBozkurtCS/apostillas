# apostillas v2: easier Notes, clearer Book page, Tags, sorting and filtering

Builds on v1 (`.scratch/apostillas-v1/spec.md`). Vocabulary is in `GLOSSARY.md`; use glossary terms exactly. On screen, the Want to read list is "Bookstack" and the Finished list is "Books" (UI labels only). Agreed in a grilling session on 2026-11-21.

## Goals

- Get to your Notes and Quotes quickly, from one page in the navbar.
- Write Notes in a proper Markdown editor.
- Make the Book page put reading content first.
- Group Books with **Tags**, and sort and filter every Library list.

## Decisions

- **Notes & Quotes page** at `/notes` replaces the Search nav item; `/search` redirects there. Search is built into the page.
- Every Note and Quote still belongs to a Book. A freestanding Journal is later.
- **Editor**: EasyMDE for writing Notes, everywhere a Note is written. Toolbar limited to what `src/lib/markdown.ts` supports (headings, bold, italic, lists, quote, code, link). The preview uses that same renderer, so it matches what is saved. The renderer is not replaced. Quotes keep a plain text box.
- **Tags** label Books only (see `GLOSSARY.md`): case-insensitive, letters, numbers and `-`, `#` is typing syntax only. A Tag disappears when no Book carries it. No rename or management page.
- **Sort and filter** state is never put in the URL and is not remembered: each visit to a list starts from its default sort with no filters.
- Shelf tiles become covers only.

## Out of scope

Journal (freestanding notes), Tags on Quotes or Notes, filtering Notes & Quotes by Tag, tagging many Books at once, Tag rename/management, remembered sort choices, replacing the Markdown renderer.

## Issues (build in this order)

| # | Issue | Blocked by |
|---|-------|------------|
| 01 | Book page: tabs, About, and a ⋯ menu | — |
| 02 | Notes & Quotes page and the Markdown editor | 01 |
| 03 | Tags on Books | 01 |
| 04 | Sort and filter the Library lists; cover-only tiles | 03 |
