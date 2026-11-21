<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import Shelf from '#lib/components/Shelf.svelte';
	import { formatDay } from '#lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Abandoned · apostillas</title>
</svelte:head>

<Shelf title="Abandoned" count={data.abandoned.length} empty="You haven't abandoned anything.">
	{#each data.abandoned as item (item.bookId)}
		<BookCard
			bookId={item.bookId}
			title={item.title}
			authors={item.authors}
			coverPath={item.coverPath}
		>
			{#snippet detail()}
				<span>Abandoned {formatDay(item.abandonedDate)}</span>
			{/snippet}
		</BookCard>
	{/each}
</Shelf>
