# Add book: search Open Library, copy metadata and cover

Status: closed
Blocked by: 02

Per ADR-0003.

## Acceptance criteria

- Add book screen: search by title, author, or ISBN; results show cover thumbnail, title, author, first-publish year
- Open Library is queried first; Google Books only when Open Library returns nothing
- Picking a result creates a Book (Want to read) with metadata copied in, the Open Library work ID stored, and the cover downloaded into the data folder
- If a Book with the same Open Library work ID already exists, navigate to it instead of creating a duplicate
- Optional "why / recommended by" field when adding
- External API calls live behind one module so tests can stub them; tests cover the fallback and the dedupe

## Comments

**RALPH (2026-11-20):** Added book search behind one stubbable module (Open Library first, Google Books fallback) and an addBook operation that copies metadata, stores the work ID, downloads the cover into the data folder, and dedupes by work ID; added the Add book screen (search + pick + optional why/recommended by). Tests cover the fallback and the dedupe.
