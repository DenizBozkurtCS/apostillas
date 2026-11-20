# Reading Status is derived from Reads, never stored

A Book's Reading Status is computed from its Reads rather than stored, so the two can never disagree. Precedence: any open Read → Reading; else any Finished Read → Finished; else any Abandoned Read → Abandoned; no Reads → Want to read. "Having finished it once" outranks a later abandoned reread, which is why we rejected "latest Read wins".

## Consequences

- Starting a Book always opens a new Read, including resuming an Abandoned Book; the abandoned Read stays in history.
- Moving a Reading Book back to Want to read means deleting its open Read.
- A Read is a Reread when the Book has an earlier Finished Read, or when the reader ticks "I've read this before" for unrecorded past reads.
