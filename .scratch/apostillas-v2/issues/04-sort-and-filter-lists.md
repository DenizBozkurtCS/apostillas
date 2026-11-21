# Sort and filter the Library lists; cover-only tiles

Status: ready-for-human
Blocked by: 03

## Acceptance criteria

### Sort (first option is the default)

- **Reading**: recently started, title, author
- **Bookstack**: recently added, title, author
- **Books**: recently finished, rating (high to low), title, author
- **Abandoned**: recently abandoned, title, author

### Filter

- Every list has a filter box that narrows by title or author as you type.
- Typing `#` suggests existing Tags; Enter turns it into a removable Tag chip. Several Tag chips match Books with **any** of them.
- **Books** also has a minimum-rating filter (any, 3★+, 4★+, 5★) and a year-finished filter.
- Different filters combine with AND, e.g. (`#scifi` OR `#classics`) AND 4★+ AND "herbert".
- An empty result says so and offers to clear the filters.

### State

- Sort and filters are never put in the URL.
- Each visit to a list starts from its default sort with no filters.

### Tiles

- Shelf tiles show the cover only. The title and author appear as a hover tooltip and remain available to screen readers.
- Books keeps the star rating and the ↻ Reread marker under the cover. Bookstack no longer shows "why / recommended by". Dates are removed.
- A Book without a cover keeps its placeholder showing the title and author.

## Comments
