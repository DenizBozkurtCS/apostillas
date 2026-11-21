<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Search · apostillas</title>
</svelte:head>

<h1>Search</h1>

<form method="GET" class="search">
	<label>
		<span>Search your Quotes and Notes</span>
		<input name="q" type="search" value={data.q} placeholder="e.g. mind-killer" />
	</label>
	<button type="submit">Search</button>
</form>

{#if data.searched}
	{#if data.hits.length === 0}
		<p class="empty">No Quotes or Notes match “{data.q}”.</p>
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

<style>
	.search {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.search label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1 1 18rem;
	}
	.search span {
		font-weight: 600;
	}
	.search input {
		padding: 0.5rem;
		font-size: 1rem;
	}
	.search button {
		padding: 0.5rem 1rem;
		font-size: 1rem;
	}
	.empty {
		color: #555;
	}
	.count {
		color: #666;
		margin: 0 0 0.75rem;
	}
	.hits {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.hit {
		display: block;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e5e5;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
	}
	.hit:hover {
		border-color: #bbb;
		background: #fafafa;
	}
	.kind {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #555;
		background: #eee;
		border-radius: 0.25rem;
		padding: 0.1rem 0.4rem;
		margin-bottom: 0.4rem;
	}
	.kind[data-kind='note'] {
		color: #1a56db;
		background: #e7edfb;
	}
	.snippet {
		display: block;
		color: #222;
	}
	.snippet :global(mark) {
		background: #fde68a;
		color: inherit;
	}
	.book {
		display: block;
		margin-top: 0.4rem;
		font-weight: 600;
	}
	.authors {
		font-weight: 400;
		color: #666;
	}
</style>
