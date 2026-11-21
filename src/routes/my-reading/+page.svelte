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
	import BookPicker, { type PickableBook } from '#lib/components/BookPicker.svelte';
	import ChosenBook from '#lib/components/ChosenBook.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let adding = $state(false);
	let editing = $state<number | null>(null);

	/** The Book the new Impression is about; null while still choosing. */
	let picked = $state<PickableBook | null>(null);

	// Closing the pop-up starts the next one from the search again.
	$effect(() => {
		if (!adding) picked = null;
	});

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

<Dialog title="Leave an Impression" bind:open={adding} medium={picked !== null}>
	{#if picked === null}
		<BookPicker books={data.books} onpick={(b) => (picked = b)} />
	{:else}
		<ChosenBook book={picked} onchange={() => (picked = null)}>
			<form method="POST" action="?/add" class="stack" use:enhance={submit({ done: () => (adding = false) })}>
				{#if form?.error && form.editId == null}<p class="error" role="alert">{form.error}</p>{/if}
				<input type="hidden" name="bookId" value={picked.id} />
				<ImpressionFields today={data.today} />
				<div class="form-actions">
					<button type="submit" class="primary">Leave Impression</button>
					<button type="button" class="ghost" onclick={() => (adding = false)}>Cancel</button>
				</div>
			</form>
		</ChosenBook>
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
</style>
