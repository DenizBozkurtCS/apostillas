<!-- One Book on a Shelf: a cover tile, with stars under a rated Finished Book. -->
<script lang="ts">
	import type { ShelfBook } from '#lib/server/shelves';
	import BookCard from './BookCard.svelte';
	import Stars from './Stars.svelte';

	let { book }: { book: ShelfBook } = $props();
</script>

{#snippet stars()}
	<Stars rating={book.rating ?? 0} />
{/snippet}

<BookCard
	bookId={book.bookId}
	title={book.title}
	authors={book.authors}
	coverPath={book.coverPath}
	detail={book.rating != null ? stars : undefined}
/>
