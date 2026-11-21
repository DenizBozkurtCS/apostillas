<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import Shelf from '#lib/components/Shelf.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Reading · apostillas</title>
</svelte:head>

<Shelf title="Reading" count={data.reading.length} empty="You're not reading anything right now.">
	{#each data.reading as item (item.bookId)}
		<BookCard
			bookId={item.bookId}
			title={item.title}
			authors={item.authors}
			coverPath={item.coverPath}
		/>
	{/each}
</Shelf>
