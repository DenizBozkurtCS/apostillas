<!--
	A Reading Status list laid out as a shelf: a responsive grid of BookCards
	under the list's heading and count, or the EmptyState when it has no Books.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import EmptyState from './EmptyState.svelte';

	let {
		title,
		count,
		empty,
		children
	}: { title: string; count: number; empty: string; children: Snippet } = $props();
</script>

<div class="page-head">
	<h1>{title}</h1>
	{#if count > 0}<span class="count">{count}</span>{/if}
</div>

{#if count === 0}
	<EmptyState message={empty} />
{:else}
	<ul class="shelf">
		{@render children()}
	</ul>
{/if}

<style>
	.shelf {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 2rem 1.25rem;
	}
	@media (max-width: 30rem) {
		.shelf {
			grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
			gap: 1.5rem 0.9rem;
		}
	}
</style>
