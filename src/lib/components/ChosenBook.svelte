<!--
	A pop-up form about a Book chosen with BookPicker: the Book's cover, title
	and author in a column on the left (a row above the form on phones), with a
	"Change book" button, and the form (`children`) beside it.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CoverThumb from './CoverThumb.svelte';
	import type { PickableBook } from './BookPicker.svelte';

	let {
		book,
		onchange,
		children
	}: { book: PickableBook; onchange: () => void; children: Snippet } = $props();
</script>

<div class="chosen-layout">
	<aside class="chosen">
		<span class="cover-slot"><CoverThumb coverPath={book.coverPath} width="100%" /></span>
		<div class="chosen-text">
			<span class="title">{book.title}</span>
			<span class="byline">{book.authors.join(', ') || 'Unknown author'}</span>
			<button type="button" class="ghost small change" onclick={onchange}>Change book</button>
		</div>
	</aside>
	<div class="chosen-form">
		{@render children()}
	</div>
</div>

<style>
	.chosen-layout {
		display: grid;
		grid-template-columns: 9rem minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}
	.chosen {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.cover-slot {
		display: block;
		width: 9rem;
	}
	.cover-slot :global(.thumb) {
		box-shadow:
			0 0 0 1px var(--border),
			0 6px 16px rgb(0 0 0 / 0.12);
	}
	.chosen-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}
	.title {
		font-weight: 650;
		overflow-wrap: anywhere;
	}
	.byline {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.change {
		margin-top: 0.25rem;
		padding-left: 0;
		padding-right: 0;
	}
	@media (max-width: 600px) {
		.chosen-layout {
			grid-template-columns: minmax(0, 1fr);
			gap: 1rem;
		}
		.chosen {
			flex-direction: row;
			align-items: flex-start;
			gap: 0.9rem;
		}
		.cover-slot {
			width: 4rem;
			flex-shrink: 0;
		}
	}
</style>
