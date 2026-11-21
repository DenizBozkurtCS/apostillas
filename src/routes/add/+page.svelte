<script lang="ts">
	import { formatRating, RATING_STEPS } from '#lib/format';
	import StatusIcon from '#lib/components/StatusIcon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Star buttons, highest first; CSS reverses them so ½ shows on the left.
	const STARS_HIGH_TO_LOW = [...RATING_STEPS].reverse();

	// Suggest hand entry when a search ran but found nothing, or after a failed
	// manual submission, so the open form is not lost.
	const suggestManual = $derived(
		(data.searched && data.results.length === 0) || Boolean(form?.manual)
	);
</script>

<svelte:head>
	<title>Add a book · apostillas</title>
</svelte:head>

<div class="add-page">
	<div class="page-head">
		<h1>Add a book</h1>
	</div>

	<form method="GET" class="search" role="search">
		<label class="visually-hidden" for="add-q">Search by title, author, or ISBN</label>
		<input
			id="add-q"
			name="q"
			type="search"
			value={data.q}
			placeholder="Search by title, author, or ISBN"
		/>
		<button type="submit" class="primary">Search</button>
	</form>

	{#if data.searched}
		{#if data.results.length === 0}
			<p class="muted">No matches for “{data.q}”. You can add it by hand below.</p>
		{:else}
			<ul class="results">
				{#each data.results as result (result.source + (result.workId ?? '') + result.title)}
					<li>
						<form method="POST" action="?/add" class="result">
							<!-- Enter in a text field presses the form's first button: keep that
							     "Want to read", not the 5-star button that follows. -->
							<button
								type="submit"
								name="addAs"
								value="want"
								class="visually-hidden"
								tabindex="-1"
								aria-hidden="true">Add to Want to read</button
							>
							{#if result.coverUrl}
								<img class="cover" src={result.coverUrl} alt="" width="64" height="96" loading="lazy" />
							{:else}
								<div class="cover cover--none" aria-hidden="true"></div>
							{/if}

							<div class="meta">
								<strong class="title">{result.title}</strong>
								<span class="byline">
									{result.authors.join(', ') || 'Unknown author'}
									{#if result.firstPublishYear}<span class="year">· {result.firstPublishYear}</span
										>{/if}
								</span>

								<div class="add-as" role="group" aria-label="Add to">
									<button
										type="submit"
										name="addAs"
										value="want"
										class="primary icon"
										title="Add to Want to read"
										aria-label="Add to Want to read"><StatusIcon status="want" /></button
									>
									<button
										type="submit"
										name="addAs"
										value="reading"
										class="icon"
										title="Add as Reading"
										aria-label="Add as Reading"><StatusIcon status="reading" /></button
									>
									<span class="read-it">
										<button
											type="submit"
											name="addAs"
											value="finished"
											class="icon"
											title="Add as Read (unrated)"
											aria-label="Add as Read, unrated"><StatusIcon status="finished" /></button
										>
										<!-- Clicking a star adds the Book as read with that rating. Each star
										     is two buttons, its left half (n−½) and right half (n). They are
										     rendered 5→½ and reversed visually, so hover fills everything to
										     the left of the pointer. -->
										<span class="stars" role="group" aria-label="Read it? Rate it">
											{#each STARS_HIGH_TO_LOW as n (n)}
												<button
													type="submit"
													name="rating"
													value={n}
													class={Number.isInteger(n) ? 'half-right' : 'half-left'}
													title={`Read it: ${formatRating(n)} of 5`}
													aria-label={`Read it, rated ${formatRating(n)} of 5`}
													><span aria-hidden="true">★</span></button
												>
											{/each}
										</span>
									</span>
								</div>

								<details class="why">
									<summary>Add why / recommended by</summary>
									<input
										name="whyRecommended"
										type="text"
										aria-label="Why / recommended by"
										placeholder="e.g. Recommended by Ana"
									/>
								</details>
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
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}

	<details class="manual" open={suggestManual}>
		<summary>
			<span>Add a book by hand</span>
			<span class="muted">For books Open Library doesn't have</span>
		</summary>

		<form method="POST" action="?/manual" enctype="multipart/form-data" class="stack manual-form">
			{#if form?.manual?.error}
				<p class="error" role="alert">{form.manual.error}</p>
			{/if}

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
				<span>Why / recommended by (optional)</span>
				<input name="whyRecommended" type="text" />
			</label>

			<label class="field">
				<span>Cover image (optional)</span>
				<input name="cover" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
			</label>

			<div class="add-as" role="group" aria-label="Add to">
				<button type="submit" name="addAs" value="want" class="primary">Add to Want to read</button>
				<button type="submit" name="addAs" value="reading">Reading</button>
				<button type="submit" name="addAs" value="finished">Read it</button>
			</div>
		</form>
	</details>
</div>

<style>
	.add-page {
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
	}
	.cover {
		width: 64px;
		height: 96px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--border);
	}
	.cover--none {
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.title {
		font-weight: 600;
		line-height: 1.3;
	}
	.byline {
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	.year {
		color: var(--text-faint);
	}

	.add-as {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}
	.read-it {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	/* Square icon-only status buttons; the label is in title / aria-label. */
	button.icon {
		width: 2.1rem;
		height: 2.1rem;
		padding: 0;
	}

	.stars {
		display: inline-flex;
		flex-direction: row-reverse;
	}
	/* Each button shows one half of a 1em-wide star glyph. */
	.stars button {
		display: inline-block;
		background: none;
		border: none;
		border-radius: 0;
		padding: 0;
		width: 0.5em;
		overflow: hidden;
		font-size: 1.35rem;
		line-height: 1;
		color: var(--star-empty);
	}
	.stars button span {
		display: inline-block;
		width: 1em;
		text-align: center;
	}
	.stars .half-right {
		margin-right: 0.08em;
	}
	.stars .half-right span {
		margin-left: -0.5em;
	}
	/* Hovering or focusing a half lights it and everything to its left. */
	.stars button:hover,
	.stars button:hover ~ button,
	.stars button:focus-visible,
	.stars button:focus-visible ~ button {
		background: none;
		color: var(--star);
	}

	.why {
		margin-top: 0.5rem;
		font-size: 0.85rem;
	}
	.why summary {
		color: var(--text-muted);
		width: fit-content;
	}
	.why summary:hover {
		color: var(--text);
	}
	.why input {
		margin-top: 0.4rem;
		max-width: 24rem;
	}

	.manual {
		margin-top: 2.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
	}
	.manual summary {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		padding: 0.9rem 1.1rem;
		font-weight: 600;
	}
	.manual summary .muted {
		font-weight: 400;
		font-size: 0.85rem;
	}
	.manual summary:hover {
		background: var(--surface);
		border-radius: var(--radius-lg);
	}
	.manual[open] summary {
		border-bottom: 1px solid var(--border);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}
	.manual-form {
		padding: 1.1rem;
	}
	.manual-form .add-as {
		margin-top: 0.25rem;
	}
</style>
