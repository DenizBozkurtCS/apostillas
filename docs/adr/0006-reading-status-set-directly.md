# Reading Status is set directly; Impressions are a separate record

Supersedes ADR-0005.

The reader switches each Reading Status (Want to read, Reading, Finished) on or off directly, and the three are independent, so a Book can have any combination or none. Dated records of reading are **Impressions** (one date, optional Rating and short review, Reread and Didn't finish markers), and they never change a Book's Reading Status. Abandoned is dropped as a status; "Didn't finish" lives on an Impression instead.

ADR-0005 derived the status from Reads so the two could never disagree, but that meant every status change had to create, close or delete a dated Read: the reader couldn't say "I've read this" without inventing dates, and logging an old read reshuffled lists. The reader wants statuses as quick switches and dates only when they choose to record them, and accepts that statuses and Impressions can disagree (e.g. Finished with no Impression, or an Impression on a Book not marked Finished).

## Consequences

- Statuses are stored on the Book, each with the moment it was switched on, used only to sort the lists ("recently started", "recently finished"); that moment is never shown.
- A Book's Rating is stored on the Book: whichever rating the reader set most recently, on the Book or on an Impression.
- Reread and Didn't finish are markers the reader ticks, never inferred.
- Amended 2026-11-21: leaving a new Impression switches Reading off, since it records that the reader has stopped, and switches Finished on unless the Impression is marked Didn't finish. Editing or deleting an Impression changes no status, and Want to read is never touched by Impressions.
- Existing data was not migrated: the library was reset to empty (a backup of `data/` was kept).
