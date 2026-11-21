# apostillas v4: Reading Statuses you set, and Impressions

Builds on v3. Vocabulary is in `GLOSSARY.md`; the model change is ADR-0006 (supersedes ADR-0005). Agreed in a grilling session on 2026-11-21.

## Goals

- Set a Book's Reading Statuses with quick switches that record no dates.
- Keep dated **Impressions** (a short review or just a record of reading) separately, and see them all on a **My Reading** page.

## Decisions

- **Reading Statuses** are Want to read (Bookstack), Reading, and Finished ("Read it"). They are independent switches: any combination, or none. **Abandoned is removed** everywhere (status, list, menu, buttons); `/abandoned` redirects to `/reading`.
- **Status buttons** on the Book page are the Add page's icon buttons. Each toggles its status; a status that's on is shown in the accent colour. Clicking a star (½–5) sets the Rating and switches Finished on, leaving the others alone. There is a Clear rating option.
- A Book with no status stays in the library (search, Shelves, Notes & Quotes) but is on no list.
- **Rating** is stored on the Book: whichever rating was set most recently, on the Book or by saving an Impression with a rating. A Book can be rated without Impressions.
- **Impression**: one date (required, defaults to today), optional Rating, optional short review (plain text, ~1,000 characters), and Reread / Didn't finish tick boxes shown as ↻ / ⊘ icons on the Impression only. Impressions never change Reading Statuses. Start dates are removed from the app.
- **Book page**: "Leave an Impression"; the Reads tab becomes **Impressions** (newest first; edit, delete).
- **My Reading** in the navbar (Library ▾ · Bookcase · My Reading · Notes & Quotes): every Impression, newest first by date, no sort options; each shows the Book's cover and title, date, stars, icons and review; "+ Leave an Impression" with a Book picker; edit and delete in place.
- **Lists**: Reading sorts by when Reading was switched on ("Recently started"); Books by when Finished was switched on ("Recently finished"); that moment is internal and never shown. Rating sort/filter use the Book's Rating. The year filter on Books uses Impression dates. No ↻ on list tiles.
- **Notes and Quotes** can be added to any Book.
- **Data**: back up `data/`, then start from an empty library (Books, Notes, Quotes, Tags, Shelves). No data migration.

## Out of scope

Impressions in Notes & Quotes search; sorting or filtering My Reading.

## Issues (build in this order)

| # | Issue | Blocked by |
|---|-------|------------|
| 01 | Reading Statuses you set; remove Abandoned; reset the library | — |
| 02 | Impressions on the Book page | 01 |
| 03 | My Reading page | 02 |
