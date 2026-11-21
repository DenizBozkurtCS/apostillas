<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import Shelf from '#lib/components/Shelf.svelte';
	import { formatDay } from '#lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Bookstack · apostillas</title>
</svelte:head>

<Shelf title="Bookstack" count={data.wantToRead.length} empty="Your Bookstack is empty.">
	{#each data.wantToRead as item (item.bookId)}
		<BookCard
			bookId={item.bookId}
			title={item.title}
			authors={item.authors}
			coverPath={item.coverPath}
		>
			{#snippet detail()}
				{#if item.whyRecommended}
					<span class="why" title={item.whyRecommended}>“{item.whyRecommended}”</span>
				{/if}
				<span>Added {formatDay(item.dateAdded)}</span>
			{/snippet}
		</BookCard>
	{/each}
</Shelf>

<style>
	.why {
		color: var(--text);
		font-style: italic;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
