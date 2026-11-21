# Book page with Read actions and metadata editing

Status: ready-for-agent
Blocked by: 05

## Acceptance criteria

- Book page shows cover, metadata, current Reading Status, and Read history (dates, outcome, rating, reread icon)
- Actions by status:
  - Want to read → Start, Log past read
  - Reading → Finish, Abandon, Back to Want to read
  - Finished or Abandoned → Start again
- Finish and Log past read let the reader set the date, rating, and "I've read this before"
- Read dates and rating are editable; a Read can be deleted after a confirmation. When the delete would change the Reading Status, the confirmation says so (e.g. "Dune will move to Want to read. Its 3 Quotes and Notes stay, but you can't add new ones until you start it again.")
- Book metadata (title, authors, Edition fields, description, "why") is editable
- Cover can be changed: upload an image, or (for Books with an Open Library work ID) pick from the covers of the work's editions. The new cover replaces the stored file in the data folder, using the same validation as other covers (JPEG/PNG/GIF/WebP, max 5 MB, provider cover hosts only). Reason: Open Library's work-level cover is sometimes a title-page scan (e.g. "Models" by Mark Manson, work OL19888731W), while an edition has the real cover.
- Delete Book, with a confirmation stating that its Reads, Quotes, and Notes will be deleted
