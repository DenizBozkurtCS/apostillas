# apostillas

A personal book tracker for one reader: the books they want to read, are reading, or have read, their impressions of them, and the quotes and notes they keep about them.

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

**Shelves** (the page):
All of the reader's Shelves together, in the order the reader arranges them.
_Avoid_: Bookcase

## Reading

**Reading Status**:
Where a Book stands for the reader: **Want to read**, **Reading**, and **Finished**. The three are independent: the reader switches each on or off directly, so a Book can have any of them, all of them, or none. Setting one records no date. The one link to Impressions: leaving an Impression switches Reading off and, unless it is marked Didn't finish, Finished on.
_Avoid_: State, shelf, list

On screen, the three lists sit under a **Library** menu, and two have their own names there: the Want to read list is **Bookstack**, and the Finished list is **Books** (the Finished switch itself reads "Read it"). These are UI labels only; code and docs keep the Reading Status names above.

**Want to read**:
The Reading Status of a Book the reader intends to read.
_Avoid_: To-read, wishlist, backlog, TBR

**Reading**:
The Reading Status of a Book the reader is currently reading.
_Avoid_: In progress, current, active

**Finished**:
The Reading Status of a Book the reader has read.
_Avoid_: Done, completed

**Rating**:
How much the reader liked a Book, ½ to 5 stars. A Book has at most one: whichever rating the reader set most recently, on the Book itself or on one of its Impressions. A Book can be rated without any Impression.

**Impression**:
A dated record of reading a Book: one date (no start date), with an optional Rating and an optional short review. It can be marked as a **Reread** or as **Didn't finish**. A Book can have many Impressions. Leaving one ends Reading and, unless it is marked Didn't finish, marks the Book Finished; otherwise Impressions never change a Book's Reading Status.
_Avoid_: Read, log, remark, review (as the whole record)

**Reread**:
A marker the reader puts on an Impression of a Book they had read before. Never inferred.
_Avoid_: Revisit, second read

**Didn't finish**:
A marker the reader puts on an Impression when they stopped partway through.
_Avoid_: DNF, abandoned, dropped

## Annotations

Quotes and Notes belong to a Book, not to any of its Impressions, and can be added to any Book.

**Quote**:
A passage copied verbatim from a Book, optionally with the page or location it came from.
_Avoid_: Highlight, excerpt, clipping

**Note**:
The reader's own detailed writing about a Book: takeaways, thoughts, and excerpts worth keeping. A short verdict belongs in an Impression instead.
_Avoid_: Comment, review, annotation (as a specific type)
