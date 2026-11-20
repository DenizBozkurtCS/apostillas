# Reading Status is derived from Reads, never stored

A Book's Reading Status is computed from its Reads rather than stored, so the two can never disagree. Precedence: any open Read → Reading; else any Finished Read → Finished; else any Abandoned Read → Abandoned; no Reads → Want to read. "Having finished it once" outranks a later abandoned reread, which is why we rejected "latest Read wins".

## Consequences

- Starting a Book always opens a new Read, including resuming an Abandoned Book; the abandoned Read stays in history.
- Moving a Reading Book back to Want to read means deleting its open Read. Quotes and Notes linked to it stay on the Book, unlinked.
- A Read is a Reread when the Book has an earlier Finished Read (ordered by date, not by when it was logged), or when the reader ticks "I've read this before". Reread is derived too, so logging an older Read later makes existing Reads Rereads retroactively.
- Deleting a Read can change the Reading Status, including dropping a Book to Want to read while it still has Quotes and Notes. The app warns before such a delete rather than blocking it.

Validated with a throwaway prototype on branch `prototype/reading-status`.
