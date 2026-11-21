<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import Shelf from '#lib/components/Shelf.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import { formatDay } from '#lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Books · apostillas</title>
</svelte:head>

<Shelf title="Books" count={data.finished.length} empty="You haven't finished anything yet.">
	{#each data.finished as item (item.bookId)}
		<BookCard
			bookId={item.bookId}
			title={item.title}
			authors={item.authors}
			coverPath={item.coverPath}
		>
			{#snippet detail()}
				{#if item.rating != null}
					<Stars rating={item.rating} />
				{/if}
				<span>
					{item.finishDate ? formatDay(item.finishDate) : 'Date unknown'}
					{#if item.isReread}
						· <span class="reread" title="Reread">↻ Reread</span>
					{/if}
				</span>
			{/snippet}
		</BookCard>
	{/each}
</Shelf>

<style>
	.reread {
		color: var(--accent);
		font-weight: 600;
	}
</style>
