<!--
	My Reading (apostillas-v4/03): every Impression, newest first, grouped by
	year. Each shows its Book's cover and title (linking to the Book), the date,
	stars, ↻ / ⊘ markers and review, with Edit (in place) and Delete.
	"+ Leave an Impression" opens a pop-up that first asks which Book (a search
	over the library), then shows the Impression form with that Book's cover
	and title beside it.
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Dialog from '#lib/components/Dialog.svelte';
	import ImpressionFields from '#lib/components/ImpressionFields.svelte';
	import ImpressionView from '#lib/components/ImpressionView.svelte';
	import { filterItems, NO_FILTER } from '#lib/domain/listView';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let adding = $state(false);
	let editing = $state<number | null>(null);

	type PickBook = PageData['books'][number];
	/** The Book the new Impression is about; null while still choosing. */
	let picked = $state<PickBook | null>(null);
	let query = $state('');
	const MAX_MATCHES = 8;
	const matches = $derived(
		query.trim() === '' ? [] : filterItems(data.books, { ...NO_FILTER, text: query }).slice(0, MAX_MATCHES)
	);

	// Closing the pop-up starts the next one from the search again.
	$effect(() => {
		if (!adding) {
			picked = null;
			query = '';
		}
	});

	/** Focus the search when it comes back after "Change book" (`autofocus` covers the pop-up opening). */
	function focusOnMount(el: HTMLElement) {
		el.focus();
	}

	function pick(book: PickBook) {
		picked = book;
		query = '';
	}

	// Enter in the search picks the first match.
	function onSearchKey(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (matches[0]) pick(matches[0]);
		}
	}

	/** The Impressions in year groups, newest year first (the list is already newest first). */
	const years = $derived.by(() => {
		const groups: { year: string; items: PageData['impressions'] }[] = [];
		for (const imp of data.impressions) {
			const year = imp.date.slice(0, 4);
			const last = groups.at(-1);
			if (last?.year === year) last.items.push(imp);
			else groups.push({ year, items: [imp] });
		}
		return groups;
	});

	// A failed edit reopens it; a failed add keeps its pop-up open.
	$effect(() => {
		if (form?.error && form.editId != null) editing = form.editId;
	});

	function submit(opts: { confirm?: string; done?: () => void } = {}): SubmitFunction {
		return ({ cancel }) => {
			if (opts.confirm && !confirm(opts.confirm)) {
				cancel();
				return;
			}
			return async ({ result, update }) => {
				await update({ reset: result.type === 'success' });
				if (result.type === 'success') opts.done?.();
			};
		};
	}

	const byline = (authors: string[]) => authors.join(', ') || 'Unknown author';
</script>

<svelte:head>
	<title>My Reading · apostillas</title>
</svelte:head>

<div class="page">
	<div class="page-head">
		<h1>My Reading</h1>
		{#if data.books.length > 0}
			<button type="button" class="primary" onclick={() => (adding = true)}>+ Leave an Impression</button>
		{/if}
	</div>

	{#if form?.error && !adding && editing === null}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	{#if data.impressions.length === 0}
		<div class="empty">
			<p class="muted">No Impressions yet.</p>
			{#if data.books.length === 0}
				<p class="muted">Add a Book first, then leave an Impression of it.</p>
			{/if}
		</div>
	{:else}
		{#each years as group (group.year)}
			<section aria-labelledby={`year-${group.year}`}>
				<h2 id={`year-${group.year}`} class="year">{group.year}</h2>
				<ul class="items">
					{#each group.items as imp (imp.id)}
						<li class="item">
							<a class="cover-link" href={`/books/${imp.book.id}`} tabindex="-1" aria-hidden="true">
								{#if imp.book.coverPath}
									<img src={`/${imp.book.coverPath}`} alt="" width="48" height="72" loading="lazy" />
								{:else}
									<span class="cover-none"></span>
								{/if}
							</a>
							<div class="body">
								<div class="head">
									<a class="book" href={`/books/${imp.book.id}`}>
										<span class="title">{imp.book.title}</span>
										<span class="byline">{byline(imp.book.authors)}</span>
									</a>
									<div class="tools">
										<button
											type="button"
											class="ghost small"
											aria-expanded={editing === imp.id}
											onclick={() => (editing = editing === imp.id ? null : imp.id)}
											>{editing === imp.id ? 'Cancel' : 'Edit'}</button
										>
										<form
											method="POST"
											action="?/delete"
											use:enhance={submit({ confirm: `Delete this Impression of ${imp.book.title}?` })}
										>
											<input type="hidden" name="bookId" value={imp.book.id} />
											<input type="hidden" name="impressionId" value={imp.id} />
											<button type="submit" class="ghost small danger">Delete</button>
										</form>
									</div>
								</div>
								{#if editing === imp.id}
									<form
										method="POST"
										action="?/edit"
										class="stack edit"
										use:enhance={submit({ done: () => (editing = null) })}
									>
										{#if form?.error && form.editId === imp.id}
											<p class="error" role="alert">{form.error}</p>
										{/if}
										<input type="hidden" name="bookId" value={imp.book.id} />
										<input type="hidden" name="impressionId" value={imp.id} />
										<ImpressionFields value={imp} today={data.today} />
										<div class="form-actions">
											<button type="submit" class="primary small">Save</button>
											<button type="button" class="ghost small" onclick={() => (editing = null)}
												>Cancel</button
											>
										</div>
									</form>
								{:else}
									<ImpressionView impression={imp} />
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</div>

{#snippet cover(book: PickBook, cls: string)}
	{#if book.coverPath}
		<img class={cls} src={`/${book.coverPath}`} alt="" loading="lazy" />
	{:else}
		<span class={`${cls} cover-none`}></span>
	{/if}
{/snippet}

<Dialog title="Leave an Impression" bind:open={adding} medium={picked !== null}>
	{#if picked === null}
		<div class="picker">
			<!-- svelte-ignore a11y_autofocus (putting the cursor in the search is the point of opening the pop-up) -->
			<input
				type="search"
				class="book-search"
				placeholder="Which book? Type its title or author…"
				aria-label="Search your books"
				autocomplete="off"
				bind:value={query}
				onkeydown={onSearchKey}
				autofocus
				use:focusOnMount
			/>
			{#if query.trim() !== ''}
				{#if matches.length === 0}
					<p class="muted no-match">No book in your library matches “{query.trim()}”.</p>
				{:else}
					<ul class="matches">
						{#each matches as b (b.bookId)}
							<li>
								<button type="button" class="match" onclick={() => pick(b)}>
									{@render cover(b, 'match-cover')}
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
		</div>
	{:else}
		<div class="leave">
			<aside class="chosen">
				{@render cover(picked, 'chosen-cover')}
				<div class="chosen-text">
					<span class="title">{picked.title}</span>
					<span class="byline">{byline(picked.authors)}</span>
					<button type="button" class="ghost small change" onclick={() => (picked = null)}>Change book</button>
				</div>
			</aside>
			<form method="POST" action="?/add" class="stack" use:enhance={submit({ done: () => (adding = false) })}>
				{#if form?.error && form.editId == null}<p class="error" role="alert">{form.error}</p>{/if}
				<input type="hidden" name="bookId" value={picked.bookId} />
				<ImpressionFields today={data.today} />
				<div class="form-actions">
					<button type="submit" class="primary">Leave Impression</button>
					<button type="button" class="ghost" onclick={() => (adding = false)}>Cancel</button>
				</div>
			</form>
		</div>
	{/if}
</Dialog>

<style>
	.page {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}
	.page-head h1 {
		margin: 0;
	}
	.empty {
		padding: 2rem 0;
	}
	.empty p {
		margin: 0 0 0.4rem;
	}
	.year {
		margin: 1.75rem 0 0.25rem;
		font-size: 0.8rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
	section:first-of-type .year {
		margin-top: 0;
	}
	.items {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.item {
		display: grid;
		grid-template-columns: 3rem 1fr;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
	}
	.item:last-child {
		border-bottom: none;
	}
	.cover-link img,
	.cover-none {
		display: block;
		width: 3rem;
		height: 4.5rem;
		object-fit: cover;
		border-radius: var(--radius-sm);
		box-shadow: 0 0 0 1px var(--border);
	}
	.cover-none {
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
	}
	.body {
		min-width: 0;
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.35rem;
	}
	.book {
		display: flex;
		flex-direction: column;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}
	.book:hover .title {
		color: var(--accent);
	}
	.title {
		font-weight: 650;
		overflow-wrap: anywhere;
	}
	.byline {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.tools {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.item:hover .tools,
	.tools:focus-within {
		opacity: 1;
	}
	@media (hover: none) {
		.tools {
			opacity: 1;
		}
	}
	.tools form {
		margin: 0;
	}
	.edit {
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
	}
	.form-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	/* Step 1: which Book. */
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
	:global(.match-cover) {
		flex-shrink: 0;
		display: block;
		width: 2rem;
		height: 3rem;
		object-fit: cover;
		border-radius: 3px;
		box-shadow: 0 0 0 1px var(--border);
	}
	.match-text,
	.chosen-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		min-width: 0;
	}

	/* Step 2: the Impression, with the Book beside it. */
	.leave {
		display: grid;
		grid-template-columns: 9rem 1fr;
		gap: 1.5rem;
		align-items: start;
	}
	.chosen {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	:global(.chosen-cover) {
		display: block;
		width: 9rem;
		aspect-ratio: 2 / 3;
		height: auto;
		object-fit: cover;
		border-radius: var(--radius-sm);
		box-shadow:
			0 0 0 1px var(--border),
			0 6px 16px rgb(0 0 0 / 0.12);
	}
	:global(.cover-none.chosen-cover),
	:global(.cover-none.match-cover) {
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
	}
	.change {
		align-self: flex-start;
		margin-top: 0.25rem;
		padding-left: 0;
		padding-right: 0;
	}
	@media (max-width: 600px) {
		.leave {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.chosen {
			flex-direction: row;
			align-items: flex-start;
			gap: 0.9rem;
		}
		:global(.chosen-cover) {
			width: 4rem;
			flex-shrink: 0;
		}
	}
</style>
