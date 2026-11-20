<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Suggest hand entry when a search ran but found nothing, or after a failed
	// manual submission, so the open form is not lost.
	const suggestManual = $derived(
		(data.searched && data.results.length === 0) || Boolean(form?.manual)
	);
</script>

<svelte:head>
	<title>Add a book · apostillas</title>
</svelte:head>

<h1>Add a book</h1>

<form method="GET" class="search">
	<label>
		<span>Search by title, author, or ISBN</span>
		<input name="q" type="search" value={data.q} placeholder="e.g. Dune" />
	</label>
	<button type="submit">Search</button>
</form>

{#if data.searched}
	{#if data.results.length === 0}
		<p class="empty">No matches. You can add it by hand instead.</p>
	{:else}
		<ul class="results">
			{#each data.results as result (result.source + (result.workId ?? '') + result.title)}
				<li>
					<form method="POST" action="?/add" class="result">
						{#if result.coverUrl}
							<img class="cover" src={result.coverUrl} alt="" width="60" />
						{:else}
							<div class="cover cover--none" aria-hidden="true"></div>
						{/if}

						<div class="meta">
							<strong>{result.title}</strong>
							<span class="byline">
								{result.authors.join(', ') || 'Unknown author'}
								{#if result.firstPublishYear}· {result.firstPublishYear}{/if}
							</span>

							<label class="why">
								<span>Why / recommended by (optional)</span>
								<input name="whyRecommended" type="text" />
							</label>
						</div>

						<input type="hidden" name="source" value={result.source} />
						<input type="hidden" name="workId" value={result.workId ?? ''} />
						<input type="hidden" name="title" value={result.title} />
						<input type="hidden" name="authors" value={JSON.stringify(result.authors)} />
						<input
							type="hidden"
							name="firstPublishYear"
							value={result.firstPublishYear ?? ''}
						/>
						<input type="hidden" name="coverUrl" value={result.coverUrl ?? ''} />
						<input type="hidden" name="isbn" value={result.isbn ?? ''} />
						<input type="hidden" name="pageCount" value={result.pageCount ?? ''} />
						<input type="hidden" name="description" value={result.description} />

						<button type="submit">Add to Want to read</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<details class="manual" open={suggestManual}>
	<summary>Add a book by hand</summary>

	<form method="POST" action="?/manual" enctype="multipart/form-data" class="manual-form">
		{#if form?.manual?.error}
			<p class="error" role="alert">{form.manual.error}</p>
		{/if}

		<label>
			<span>Title</span>
			<input name="title" type="text" required />
		</label>

		<label>
			<span>Author(s), separated by commas</span>
			<input name="authors" type="text" placeholder="e.g. Ursula K. Le Guin" />
		</label>

		<div class="row">
			<label>
				<span>ISBN (optional)</span>
				<input name="isbn" type="text" />
			</label>
			<label>
				<span>Page count (optional)</span>
				<input name="pageCount" type="number" min="1" />
			</label>
		</div>

		<label>
			<span>Description (optional)</span>
			<textarea name="description" rows="3"></textarea>
		</label>

		<label>
			<span>Why / recommended by (optional)</span>
			<input name="whyRecommended" type="text" />
		</label>

		<label>
			<span>Cover image (optional)</span>
			<input name="cover" type="file" accept="image/*" />
		</label>

		<button type="submit">Add to Want to read</button>
	</form>
</details>

<style>
	.search {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
		margin-bottom: 1.5rem;
	}
	.search label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}
	.results {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.result {
		display: grid;
		grid-template-columns: 60px 1fr auto;
		gap: 1rem;
		align-items: start;
	}
	.cover {
		width: 60px;
		height: 90px;
		object-fit: cover;
		background: #eee;
	}
	.cover--none {
		border: 1px dashed #bbb;
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.byline {
		color: #555;
	}
	.why {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		margin-top: 0.4rem;
		font-size: 0.85rem;
	}
	.empty {
		color: #555;
	}
	.manual {
		margin-top: 2rem;
		border-top: 1px solid #ddd;
		padding-top: 1rem;
	}
	.manual summary {
		cursor: pointer;
		font-weight: 600;
	}
	.manual-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 32rem;
		margin-top: 1rem;
	}
	.manual-form label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.manual-form .row {
		display: flex;
		gap: 0.75rem;
	}
	.manual-form .row label {
		flex: 1;
	}
	.manual-form .error {
		color: #b00020;
		margin: 0;
	}
	.manual-form button {
		align-self: flex-start;
	}
</style>
