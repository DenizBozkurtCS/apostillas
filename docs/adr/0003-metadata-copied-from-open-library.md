# Book metadata is copied in, Open Library first

When a Book is added, its metadata is looked up on Open Library (Google Books as fallback when Open Library has no match) and **copied** into our own store. It is never fetched live on display. This lets the reader correct bad metadata, keeps the app working offline, and avoids depending on third-party uptime or rate limits. Scraping Goodreads was rejected (against their terms and brittle).

## Consequences

- Metadata does not refresh automatically; an explicit "re-fetch" action is needed if wanted.
- Covers must be downloaded and stored locally, or the offline guarantee breaks.
