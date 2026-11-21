<!--
	A Shelf's page (apostillas-v3). Issue 01 shows the Shelf's Books in its
	order; adding, removing and arranging come in issue 02.
-->
<script lang="ts">
	import ShelfTile from '#lib/components/ShelfTile.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const shelf = $derived(data.shelf);
</script>

<svelte:head>
	<title>{shelf.name} · apostillas</title>
</svelte:head>

<a class="back" href="/bookcase">← Bookcase</a>
<div class="page-head">
	<h1>{shelf.name}</h1>
	{#if shelf.books.length > 0}<span class="count">{shelf.books.length}</span>{/if}
</div>
{#if shelf.description}
	<p class="description">{shelf.description}</p>
{/if}

{#if shelf.books.length === 0}
	<p class="muted empty">No books yet.</p>
{:else}
	<ul class="grid">
		{#each shelf.books as book (book.bookId)}
			<ShelfTile {book} />
		{/each}
	</ul>
{/if}

<style>
	.back {
		display: inline-block;
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		text-decoration: none;
	}
	.back:hover {
		color: var(--accent);
	}
	.description {
		max-width: var(--content-narrow);
		margin: -0.5rem 0 1.75rem;
		color: var(--text-muted);
		white-space: pre-line;
	}
	.grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1.75rem 1.25rem;
	}
	@media (max-width: 30rem) {
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
			gap: 1.25rem 0.9rem;
		}
	}
</style>
