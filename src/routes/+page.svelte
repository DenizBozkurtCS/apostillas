<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Reading · apostillas</title>
</svelte:head>

<h1>Reading</h1>

{#if data.reading.length === 0}
	<EmptyState message="You're not reading anything right now." />
{:else}
	<ul class="list">
		{#each data.reading as item (item.bookId)}
			<BookCard
				bookId={item.bookId}
				title={item.title}
				authors={item.authors}
				coverPath={item.coverPath}
			/>
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
</style>
