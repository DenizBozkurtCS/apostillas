# apostillas

A personal book tracker for one reader: the books they want to read, are reading, have finished or abandoned, and the quotes and notes they keep about them.

## Books

**Book**:
A work as its author wrote it (e.g. "Dune" by Frank Herbert), independent of any particular printing. A Book is the unit everything else attaches to.
_Avoid_: Title, work, item

**Edition**:
A specific publication of a Book (a particular ISBN, cover, and page count). Optional detail on a Book, never its identity.
_Avoid_: Copy, version, printing

**Tag**:
A short, case-insensitive label the reader puts on a Book to group it with others (e.g. #scifi, #from-ana). A Book can carry many Tags, and a Tag exists only while at least one Book carries it. Tags are independent of Reading Status and belong to Books only, never to Quotes or Notes.
_Avoid_: Shelf, label, category, genre

**Shelf**:
A named collection of Books the reader curates and arranges by hand (e.g. "Summer 2027", "Gifts for Dad"), with an optional description. A Book can sit on many Shelves, whatever its Reading Status, and removing it from a Shelf or deleting the Shelf never deletes the Book. Unlike a Tag, a Shelf exists on its own, even when empty.
_Avoid_: List, collection, playlist

**Bookcase**:
All of the reader's Shelves together, in the order the reader arranges them.

## Reading

**Reading Status**:
Where a Book stands for the reader: **Want to read**, **Reading**, **Finished**, or **Abandoned**. Always derived from the Book's Reads, never set directly.
_Avoid_: State, shelf, list

On screen, the four lists sit under a **Library** menu, and two have their own names there: the Want to read list is **Bookstack**, and the Finished list is **Books** (a single Finished Book is still badged "Finished"). These are UI labels only; code and docs keep the Reading Status names above.

**Want to read**:
The Reading Status of a Book the reader intends to read but has not started.
_Avoid_: To-read, wishlist, backlog, TBR

**Reading**:
The Reading Status of a Book the reader is currently partway through.
_Avoid_: In progress, current, active

**Finished**:
The Reading Status of a Book the reader has completed at least one Read of.
_Avoid_: Read (as an adjective), done, completed

**Abandoned**:
The Reading Status of a Book the reader started and deliberately stopped without finishing.
_Avoid_: DNF, dropped, stopped, paused

**Read**:
One pass through a Book, from starting it to finishing or abandoning it. A Book can have many Reads.
_Avoid_: Reading (as a noun for this), session

**Reread**:
A Read of a Book the reader had already finished before it, whether or not that earlier Read is recorded.
_Avoid_: Revisit, second read

## Annotations

Quotes and Notes belong to a Book, not to any of its Reads. They can be added to any Book except one that is Want to read.

**Quote**:
A passage copied verbatim from a Book, optionally with the page or location it came from.
_Avoid_: Highlight, excerpt, clipping

**Note**:
The reader's own writing about a Book: a thought, review, or summary.
_Avoid_: Comment, review, annotation (as a specific type)
