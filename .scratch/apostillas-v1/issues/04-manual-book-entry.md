# Add book manually

Status: closed
Blocked by: 03

## Acceptance criteria

- Available from Add book at all times, and suggested when search finds nothing
- Fields: title, author(s), optional ISBN, page count, description, "why / recommended by", cover image upload
- Duplicate check by case-insensitive title + author; a match opens the existing Book instead
- Uploaded cover is stored in the data folder

## Comments

**RALPH (2026-11-20):** Added manual book entry: addBookManually() with case-insensitive title+author dedupe and uploaded-cover storage, plus a ?/manual action and an always-available hand-entry form on Add book (auto-opened when search finds nothing).
