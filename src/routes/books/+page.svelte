<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import LibraryList from '#lib/components/LibraryList.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Books · apostillas</title>
</svelte:head>

<LibraryList
	title="Books"
	items={data.finished}
	empty="You haven't finished anything yet."
	ratingAndYear
	sorts={[
		{ key: 'recent', label: 'Recently finished' },
		{ key: 'rating', label: 'Rating' },
		{ key: 'title', label: 'Title' },
		{ key: 'author', label: 'Author' }
	]}
>
	{#snippet card(item)}
		<BookCard bookId={item.bookId} title={item.title} authors={item.authors} coverPath={item.coverPath}>
			{#snippet detail()}
				{#if item.rating != null || item.isReread}
					<span class="detail">
						{#if item.rating != null}<Stars rating={item.rating} />{/if}
						{#if item.isReread}<span class="reread" title="Reread">↻<span class="visually-hidden"> Reread</span></span>{/if}
					</span>
				{/if}
			{/snippet}
		</BookCard>
	{/snippet}
</LibraryList>

<style>
	.detail {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}
	.reread {
		color: var(--accent);
		font-weight: 700;
	}
</style>
