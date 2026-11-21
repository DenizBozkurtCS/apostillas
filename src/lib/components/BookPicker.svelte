<!--
	"Which book?": a search over the library that lists matching Books (cover,
	title, author) as you type. Clicking one, or Enter for the top match, calls
	`onpick`. Matching is by every word in the title or authors, ignoring case
	and accents. Used at the start of pop-ups that write about a Book chosen
	from the whole library (Leave an Impression, Add a Note, Add a Quote).
-->
<script lang="ts" module>
	export interface PickableBook {
		id: number;
		title: string;
		authors: string[];
		coverPath: string | null;
	}
</script>

<script lang="ts">
	import { filterItems, NO_FILTER } from '#lib/domain/listView';
	import CoverThumb from './CoverThumb.svelte';

	let { books, onpick }: { books: readonly PickableBook[]; onpick: (book: PickableBook) => void } =
		$props();

	const MAX_MATCHES = 8;
	let query = $state('');
	const searchable = $derived(books.map((b) => ({ ...b, bookId: b.id, tags: [] })));
	const matches = $derived(
		query.trim() === ''
			? []
			: filterItems(searchable, { ...NO_FILTER, text: query }).slice(0, MAX_MATCHES)
	);

	/** Focus the search when it appears inside an already-open pop-up ("Change book"). */
	function focusOnMount(el: HTMLElement) {
		el.focus();
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (matches[0]) onpick(matches[0]);
		}
	}

	const byline = (authors: string[]) => authors.join(', ') || 'Unknown author';
</script>

<div class="picker">
	{#if books.length === 0}
		<p class="muted">Add a Book to your library first.</p>
	{:else}
		<!-- svelte-ignore a11y_autofocus (putting the cursor in the search is the point of opening the pop-up) -->
		<input
			type="search"
			class="book-search"
			placeholder="Which book? Type its title or author…"
			aria-label="Search your books"
			autocomplete="off"
			bind:value={query}
			onkeydown={onKey}
			autofocus
			use:focusOnMount
		/>
		{#if query.trim() !== ''}
			{#if matches.length === 0}
				<p class="muted no-match">No book in your library matches “{query.trim()}”.</p>
			{:else}
				<ul class="matches">
					{#each matches as b (b.id)}
						<li>
							<button type="button" class="match" onclick={() => onpick(b)}>
								<CoverThumb coverPath={b.coverPath} width="2rem" />
								<span class="match-text">
									<span class="title">{b.title}</span>
									<span class="byline">{byline(b.authors)}</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.book-search {
		width: 100%;
	}
	.no-match {
		margin: 0.75rem 0 0;
	}
	.matches {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
	}
	.match {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.75rem;
		width: 100%;
		padding: 0.45rem 0.5rem;
		border: none;
		background: none;
		border-radius: var(--radius-sm);
		text-align: left;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.match:hover,
	.match:focus-visible {
		background: var(--accent-soft);
	}
	.matches li:first-child .match {
		box-shadow: inset 0 0 0 1px var(--border);
	}
	.match-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
		text-align: left;
	}
	.title {
		font-weight: 650;
		overflow-wrap: anywhere;
	}
	.byline {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
</style>
