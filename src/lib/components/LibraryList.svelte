<!--
	A Library list page: heading and count, sort and filter controls, then the
	shelf of cover tiles. Sort and filters live in this component's state, so
	every visit starts from the default sort with no filters, and nothing goes
	into the URL. Each list passes its items, its sort options and a `card`
	snippet for one tile, and may put its own controls in the heading (`aside`).
-->
<script lang="ts" generics="T extends ViewItem">
	import type { Snippet } from 'svelte';
	import {
		NO_FILTER,
		filterItems,
		impressionYears,
		isFiltering,
		sortItems,
		tagsIn,
		type ListFilter,
		type SortChoice,
		type ViewItem
	} from '#lib/domain/listView';
	import EmptyState from './EmptyState.svelte';
	import ListControls from './ListControls.svelte';

	let {
		title,
		items,
		empty,
		sorts,
		ratingAndYear = false,
		card,
		aside
	}: {
		title: string;
		items: T[];
		/** Shown when the list has no Books at all. */
		empty: string;
		/** Sort options; the first is the default. */
		sorts: { key: SortChoice; label: string }[];
		/** Offer the minimum-rating and year-finished filters (Books). */
		ratingAndYear?: boolean;
		card: Snippet<[T]>;
		/** Extra controls at the right of the heading. */
		aside?: Snippet;
	} = $props();

	// svelte-ignore state_referenced_locally
	let sort = $state<SortChoice>(sorts[0].key);
	let filter = $state<ListFilter>({ ...NO_FILTER, tags: [] });

	const filtering = $derived(isFiltering(filter));
	const shown = $derived(sortItems(filterItems(items, filter), sort));
	const tags = $derived(tagsIn(items));
	const years = $derived(ratingAndYear ? impressionYears(items) : null);

	/** Bumped to remount the controls, which also empties their text box. */
	let resetKey = $state(0);
	function clearFilters() {
		filter = { ...NO_FILTER, tags: [] };
		resetKey++;
	}
</script>

<div class="page-head">
	<h1 class="page-title">{title}</h1>
	{#if items.length > 0}
		<span class="count">{filtering ? `${shown.length} of ${items.length}` : items.length}</span>
	{/if}
	{#if aside}
		<div class="aside">{@render aside()}</div>
	{/if}
</div>

{#if items.length === 0}
	<EmptyState message={empty} />
{:else}
	{#key resetKey}
		<ListControls bind:sort bind:filter {sorts} {tags} {years} />
	{/key}
	{#if shown.length === 0}
		<div class="no-match">
			<p>No books match these filters.</p>
			<button type="button" class="small" onclick={clearFilters}>Clear filters</button>
		</div>
	{:else}
		<ul class="shelf">
			{#each shown as item (item.bookId)}
				{@render card(item)}
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.page-head {
		flex-wrap: wrap;
	}
	.aside {
		margin-left: auto;
		max-width: 100%;
		align-self: center;
	}
	.shelf {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1.75rem 1.25rem;
	}
	@media (max-width: 30rem) {
		.shelf {
			grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
			gap: 1.25rem 0.9rem;
		}
	}
	.no-match {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
		color: var(--text-muted);
		text-align: center;
	}
	.no-match p {
		margin: 0;
	}
</style>
