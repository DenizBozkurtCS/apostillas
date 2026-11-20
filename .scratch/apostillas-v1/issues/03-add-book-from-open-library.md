# Add book: search Open Library, copy metadata and cover

Status: ready-for-agent
Blocked by: 02

Per ADR-0003.

## Acceptance criteria

- Add book screen: search by title, author, or ISBN; results show cover thumbnail, title, author, first-publish year
- Open Library is queried first; Google Books only when Open Library returns nothing
- Picking a result creates a Book (Want to read) with metadata copied in, the Open Library work ID stored, and the cover downloaded into the data folder
- If a Book with the same Open Library work ID already exists, navigate to it instead of creating a duplicate
- Optional "why / recommended by" field when adding
- External API calls live behind one module so tests can stub them; tests cover the fallback and the dedupe
