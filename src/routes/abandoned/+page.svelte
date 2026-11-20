<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { formatDay } from '#lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Abandoned · apostillas</title>
</svelte:head>

<h1>Abandoned</h1>

{#if data.abandoned.length === 0}
	<EmptyState message="You haven't abandoned anything." />
{:else}
	<ul class="list">
		{#each data.abandoned as item (item.bookId)}
			<BookCard
				bookId={item.bookId}
				title={item.title}
				authors={item.authors}
				coverPath={item.coverPath}
			>
				{#snippet detail()}
					<span class="abandoned">Abandoned {formatDay(item.abandonedDate)}</span>
				{/snippet}
			</BookCard>
		{/each}
	</ul>
{/if}

<style>
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.abandoned {
		color: #666;
	}
</style>
