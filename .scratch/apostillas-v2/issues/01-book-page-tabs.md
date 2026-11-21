# Book page: tabs, About, and a ⋯ menu

Status: closed
Blocked by: —

Make the Book page put reading content first and move management out of the way.

## Acceptance criteria

- Header keeps the cover, status badge, title, author, and edition details, with the status actions below them (main action filled).
- A **⋯** button in the header opens a menu with **Edit details**, **Change cover**, **Sync from Open Library** (only when the Book has an Open Library work), and **Delete book**. Each opens in a dialog over the page. The bottom Manage box is removed.
- The description shows as **About** under the header, cut to about 3 lines with a "more" toggle when it is longer.
- Below that, tabs **Notes (n) · Quotes (n) · Reads (n)** with counts, opening on Notes. Each tab keeps today's add, edit, and delete behaviour.
- A Bookstack (Want to read) Book shows only About and Reads, with "Start reading" as the main action, because it cannot have Quotes or Notes yet.
- Form errors still show where they happened: a failed Note keeps the Notes tab open, a failed details edit reopens its dialog.
- Works on phones and in light and dark mode.

## Comments

**RALPH (2026-11-21):** Built 2026-11-21. Header with a ⋯ menu (Edit details, Change cover, Sync from Open Library, Delete book), each in a native <dialog>; About clamped to 3 lines with Show more; tabs Notes/Quotes/Reads with counts. Forms use enhance so the tab survives a save and forms close on success; a failed save reopens its tab or dialog (Sync now returns syncError). A Bookstack Book has no Reads by definition, so instead of 'About and Reads' it shows About plus Notes/Quotes tabs only when it kept some.
