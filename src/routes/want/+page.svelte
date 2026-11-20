<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { formatDay } from '#lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Want to read · apostillas</title>
</svelte:head>

<h1>Want to read</h1>

{#if data.wantToRead.length === 0}
	<EmptyState message="Nothing on your list yet." />
{:else}
	<ul class="list">
		{#each data.wantToRead as item (item.bookId)}
			<BookCard
				bookId={item.bookId}
				title={item.title}
				authors={item.authors}
				coverPath={item.coverPath}
			>
				{#snippet detail()}
					<span class="added">Added {formatDay(item.dateAdded)}</span>
					{#if item.whyRecommended}
						<p class="why">{item.whyRecommended}</p>
					{/if}
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
	.added {
		color: #666;
	}
	.why {
		margin: 0.2rem 0 0;
	}
</style>
