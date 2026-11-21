<!--
	Add a book: the navbar search's results. Books already in the library that
	match come first (clicking one opens it). Below, the provider's results, each
	with a short description: clicking a cover (or title) adds that Book to the
	library with no Reading Status and opens its page; a result that is already
	in the library just opens it. "Add a book by hand" opens a pop-up form.
-->
<script lang="ts">
	import Dialog from '#lib/components/Dialog.svelte';
	import { previewDescription } from '#lib/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// A failed manual submission reopens the pop-up so the reader sees why.
	// svelte-ignore state_referenced_locally
	let manualOpen = $state(Boolean(form?.manual));
	$effect(() => {
		if (form?.manual) manualOpen = true;
	});

	/** The result being added, to show progress while its cover downloads. */
	let adding = $state<string | null>(null);

	const byline = (authors: string[]) => authors.join(', ') || 'Unknown author';
	const keyOf = (r: PageData['results'][number]) => r.source + (r.workId ?? '') + r.title;
	const found = $derived(data.library.length + data.results.length);
</script>

<svelte:head>
	<title>{data.searched ? `“${data.q}” · Add a book` : 'Add a book'} · apostillas</title>
</svelte:head>

{#snippet description(text: string)}
	{@const preview = previewDescription(text)}
	{#if preview}
		<p class="description">{preview}</p>
	{:else}
		<p class="description none">No description.</p>
	{/if}
{/snippet}

<!-- The search box is the navbar's book search; this page shows its results. -->
<div class="add-page">
	<div class="page-head">
		<h1>{data.searched ? `Results for “${data.q}”` : 'Add a book'}</h1>
		<button type="button" onclick={() => (manualOpen = true)}>Add a book by hand</button>
	</div>

	{#if !data.searched}
		<p class="muted">Search by title, author, or ISBN in the bar at the top.</p>
	{:else if found === 0}
		<p class="muted">No matches for “{data.q}”. You can add it by hand.</p>
	{/if}

	{#if data.library.length > 0}
		<section aria-labelledby="in-library">
			<h2 id="in-library" class="eyebrow">In your library</h2>
			<ul class="results">
				{#each data.library as b (b.id)}
					<li class="result">
						<a class="cover-link" href={`/books/${b.id}`} tabindex="-1" aria-hidden="true">
							{#if b.coverPath}
								<img class="cover" src={`/${b.coverPath}`} alt="" width="64" height="96" loading="lazy" />
							{:else}
								<span class="cover cover--none"></span>
							{/if}
						</a>
						<div class="meta">
							<a class="title" href={`/books/${b.id}`}>{b.title}</a>
							<span class="byline">{byline(b.authors)}</span>
							{@render description(b.description)}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.results.length > 0}
		<section aria-labelledby="from-search">
			<h2 id="from-search" class="eyebrow">
				{data.library.length > 0 ? 'More results' : 'Results'}
				<span class="hint">· click a cover to add it to your library</span>
			</h2>
			<ul class="results">
				{#each data.results as result (keyOf(result))}
					<li>
						{#if result.existingId !== null}
							<!-- Already in the library (e.g. found by ISBN): just open it. -->
							<div class="result">
								<a class="cover-link" href={`/books/${result.existingId}`} title="Open in your library">
									{#if result.coverUrl}
										<img class="cover" src={result.coverUrl} alt="" width="64" height="96" loading="lazy" />
									{:else}
										<span class="cover cover--none"></span>
									{/if}
									<span class="visually-hidden">Open {result.title}</span>
								</a>
								<div class="meta">
									<a class="title" href={`/books/${result.existingId}`}>{result.title}</a>
									<span class="byline">
										{byline(result.authors)}
										{#if result.firstPublishYear}<span class="year">· {result.firstPublishYear}</span>{/if}
										<span class="in-library">· In your library</span>
									</span>
									{@render description(result.description)}
								</div>
							</div>
						{:else}
							<form
								method="POST"
								action="?/add"
								class="result"
								aria-busy={adding === keyOf(result)}
								onsubmit={() => (adding = keyOf(result))}
							>
								<button
									type="submit"
									class="cover-button"
									title="Add to your library"
									disabled={adding !== null}
								>
									{#if result.coverUrl}
										<img class="cover" src={result.coverUrl} alt="" width="64" height="96" loading="lazy" />
									{:else}
										<span class="cover cover--none"></span>
									{/if}
									<span class="visually-hidden">Add {result.title} to your library</span>
								</button>
								<div class="meta">
									<button type="submit" class="title title-button" tabindex="-1" disabled={adding !== null}
										>{result.title}</button
									>
									<span class="byline">
										{byline(result.authors)}
										{#if result.firstPublishYear}<span class="year">· {result.firstPublishYear}</span>{/if}
									</span>
									{#if adding === keyOf(result)}
										<p class="description adding">Adding to your library…</p>
									{:else}
										{@render description(result.description)}
									{/if}
								</div>

								<input type="hidden" name="source" value={result.source} />
								<input type="hidden" name="workId" value={result.workId ?? ''} />
								<input type="hidden" name="title" value={result.title} />
								<input type="hidden" name="authors" value={JSON.stringify(result.authors)} />
								<input type="hidden" name="firstPublishYear" value={result.firstPublishYear ?? ''} />
								<input type="hidden" name="coverUrl" value={result.coverUrl ?? ''} />
								<input type="hidden" name="isbn" value={result.isbn ?? ''} />
								<input type="hidden" name="pageCount" value={result.pageCount ?? ''} />
								<input type="hidden" name="description" value={result.description} />
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<Dialog title="Add a book by hand" bind:open={manualOpen}>
	<form method="POST" action="?/manual" enctype="multipart/form-data" class="stack">
		{#if form?.manual?.error}
			<p class="error" role="alert">{form.manual.error}</p>
		{/if}
		<p class="muted small">For books Open Library doesn't have.</p>

		<label class="field">
			<span>Title</span>
			<input name="title" type="text" required />
		</label>

		<label class="field">
			<span>Author(s), separated by commas</span>
			<input name="authors" type="text" placeholder="e.g. Ursula K. Le Guin" />
		</label>

		<div class="row">
			<label class="field">
				<span>ISBN (optional)</span>
				<input name="isbn" type="text" />
			</label>
			<label class="field">
				<span>Page count (optional)</span>
				<input name="pageCount" type="number" min="1" />
			</label>
		</div>

		<label class="field">
			<span>Description (optional)</span>
			<textarea name="description" rows="3"></textarea>
		</label>

		<label class="field">
			<span>Cover image (optional)</span>
			<input name="cover" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
		</label>

		<div class="add-as" role="group" aria-label="Add to">
			<button type="submit" name="addAs" value="want" class="primary">Add to Bookstack</button>
			<button type="submit" name="addAs" value="reading">Reading</button>
			<button type="submit" name="addAs" value="finished">Read it</button>
		</div>
	</form>
</Dialog>

<style>
	.add-page {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-bottom: 1rem;
	}
	.page-head h1 {
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	section + section {
		margin-top: 2rem;
	}
	.eyebrow {
		margin: 1rem 0 0.25rem;
		font-size: 0.75rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
	.hint {
		font-weight: 500;
		letter-spacing: 0;
		text-transform: none;
	}

	.results {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	.results li {
		border-bottom: 1px solid var(--border);
	}
	.results li:last-child {
		border-bottom: none;
	}
	.result {
		display: grid;
		grid-template-columns: 64px 1fr;
		gap: 1rem;
		align-items: start;
		padding: 1rem 0;
		margin: 0;
	}
	.result[aria-busy='true'] {
		opacity: 0.7;
	}

	.cover-link,
	.cover-button {
		display: block;
		padding: 0;
		border: none;
		background: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
	.cover {
		display: block;
		width: 64px;
		height: 96px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--border);
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}
	.cover--none {
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
	}
	.cover-link:hover .cover,
	.cover-button:hover:not(:disabled) .cover,
	.cover-button:focus-visible .cover {
		transform: translateY(-2px);
		box-shadow:
			0 0 0 2px var(--accent),
			0 8px 20px rgb(0 0 0 / 0.14);
	}
	.cover-button:disabled {
		cursor: progress;
	}

	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		min-width: 0;
	}
	.title {
		font-weight: 600;
		line-height: 1.3;
		color: var(--text);
		text-decoration: none;
		text-align: left;
	}
	a.title:hover,
	.title-button:hover:not(:disabled) {
		color: var(--accent);
	}
	.title-button {
		max-width: 100%;
		white-space: normal;
		overflow-wrap: anywhere;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.title-button:disabled {
		cursor: progress;
	}
	.byline {
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	.year,
	.in-library {
		color: var(--text-faint);
	}
	.description {
		margin: 0.35rem 0 0;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--text-muted);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.description.none {
		color: var(--text-faint);
		font-style: italic;
	}
	.description.adding {
		color: var(--accent);
		font-weight: 600;
	}

	.small {
		margin: 0;
		font-size: 0.85rem;
	}
	.add-as {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}
</style>
