# Add book manually

Status: ready-for-agent
Blocked by: 03

## Acceptance criteria

- Available from Add book at all times, and suggested when search finds nothing
- Fields: title, author(s), optional ISBN, page count, description, "why / recommended by", cover image upload
- Duplicate check by case-insensitive title + author; a match opens the existing Book instead
- Uploaded cover is stored in the data folder
