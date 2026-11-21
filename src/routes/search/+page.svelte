<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Search · apostillas</title>
</svelte:head>

<div class="search-page">
	<div class="page-head">
		<h1>Search</h1>
	</div>

	<form method="GET" class="search" role="search">
		<label class="visually-hidden" for="search-q">Search your Quotes and Notes</label>
		<input
			id="search-q"
			name="q"
			type="search"
			value={data.q}
			placeholder="Search your Quotes and Notes"
		/>
		<button type="submit" class="primary">Search</button>
	</form>

	{#if data.searched}
		{#if data.hits.length === 0}
			<p class="muted">No Quotes or Notes match “{data.q}”.</p>
		{:else}
			<p class="count">
				{data.hits.length}
				{data.hits.length === 1 ? 'result' : 'results'}
			</p>
			<ul class="hits">
				{#each data.hits as hit (hit.kind + hit.refId)}
					<li>
						<a class="hit" href="/books/{hit.bookId}">
							<span class="kind" data-kind={hit.kind}>
								{hit.kind === 'quote' ? 'Quote' : 'Note'}
							</span>
							<!-- Snippet is HTML-escaped server-side with <mark> around matches. -->
							<span class="snippet">{@html hit.snippetHtml}</span>
							<span class="book">
								{hit.bookTitle}{#if hit.bookAuthors.length > 0}
									<span class="authors"> · {hit.bookAuthors.join(', ')}</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.search-page {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}
	.search {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.75rem;
	}
	.search input {
		flex: 1;
		font-size: 1rem;
		padding: 0.6rem 0.8rem;
	}
	.count {
		color: var(--text-faint);
		font-size: 0.9rem;
		margin: 0 0 0.75rem;
	}
	.hits {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.hit {
		display: block;
		padding: 0.9rem 1.1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.12s,
			background-color 0.12s;
	}
	.hit:hover {
		color: inherit;
		border-color: var(--border-strong);
		background: var(--surface);
	}
	.kind {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.05rem 0.5rem;
		margin-bottom: 0.45rem;
	}
	.kind[data-kind='note'] {
		color: var(--accent);
		background: var(--accent-soft);
		border-color: transparent;
	}
	.snippet {
		display: block;
		line-height: 1.55;
	}
	.snippet :global(mark) {
		background: var(--mark);
		color: inherit;
		border-radius: 2px;
		padding: 0 1px;
	}
	.book {
		display: block;
		margin-top: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.authors {
		font-weight: 400;
		color: var(--text-muted);
	}
</style>
