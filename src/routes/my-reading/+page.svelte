<!--
	My Reading (apostillas-v4/03): every Impression, newest first, grouped by
	year. Every row is the same height: the Book's cover, its title and author
	(linking to the Book) on one line and the review cut to three lines, with
	"more" to open a longer one in place; on the right, the
	date, stars and ↻ / ⊘ icons, with Edit (in place) and Delete.
	"+ Leave an Impression" opens a pop-up that first asks which Book (a search
	over the library), then shows the Impression form with that Book's cover
	and title beside it.
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Dialog from '#lib/components/Dialog.svelte';
	import ImpressionFields from '#lib/components/ImpressionFields.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import { formatDay } from '#lib/format';
	import BookPicker, { type PickableBook } from '#lib/components/BookPicker.svelte';
	import ChosenBook from '#lib/components/ChosenBook.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let adding = $state(false);
	let editing = $state<number | null>(null);

	/** Impressions whose review is opened in full ("more"). */
	let expanded = $state<Set<number>>(new Set());
	/** Impressions whose review is longer than the three lines shown. */
	let cut = $state<Set<number>>(new Set());

	function toggleExpanded(id: number) {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded = next;
	}

	/** Notice whether a clamped review is cut off, now and when the width changes. */
	function watchCut(node: HTMLElement, id: number) {
		const check = () => {
			if (expanded.has(id)) return;
			const isCut = node.scrollHeight > node.clientHeight + 1;
			if (isCut !== cut.has(id)) {
				const next = new Set(cut);
				if (isCut) next.add(id);
				else next.delete(id);
				cut = next;
			}
		};
		const observer = new ResizeObserver(check);
		observer.observe(node);
		check();
		return { destroy: () => observer.disconnect() };
	}

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
		<h1 class="page-title">My Reading</h1>
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
						<li class="item" class:open={editing === imp.id || expanded.has(imp.id)}>
							<a class="cover-link" href={`/books/${imp.book.id}`} tabindex="-1" aria-hidden="true">
								{#if imp.book.coverPath}
									<img src={`/${imp.book.coverPath}`} alt="" width="56" height="84" loading="lazy" />
								{:else}
									<span class="cover-none"></span>
								{/if}
							</a>
							<div class="body">
								<a class="book" href={`/books/${imp.book.id}`}>
									<span class="title">{imp.book.title}</span>
									<span class="byline">· {byline(imp.book.authors)}</span>
								</a>
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
								{:else if imp.review}
									{@const open = expanded.has(imp.id)}
									<div class="review-wrap">
										<p class="review" class:open use:watchCut={imp.id}>{imp.review}</p>
										{#if open || cut.has(imp.id)}
											<button
												type="button"
												class="more"
												class:open
												aria-expanded={open}
												onclick={() => toggleExpanded(imp.id)}>{open ? 'less' : 'more'}</button
											>
										{/if}
									</div>
								{/if}
							</div>
							<div class="side">
								{#if editing !== imp.id}
									<time datetime={imp.date}>{formatDay(imp.date)}</time>
									<div class="marks">
										{#if imp.rating != null}<Stars rating={imp.rating} />{/if}
										{#if imp.reread}
											<span class="icon" title="Reread" aria-label="Reread" role="img">↻</span>
										{/if}
										{#if imp.didNotFinish}
											<span class="icon dnf" title="Didn't finish" aria-label="Didn't finish" role="img"
												>⊘</span
											>
										{/if}
									</div>
								<div class="tools">
									<button
										type="button"
										class="ghost small"
										onclick={() => (editing = imp.id)}>Edit</button
									>
									<form
										method="POST"
										action="?/delete"
										use:enhance={submit({ confirm: `Delete this Impression of ${imp.book.title}?` })}
									>
										<input type="hidden" name="bookId" value={imp.book.id} />
										<input type="hidden" name="impressionId" value={imp.id} />
										<button
											type="submit"
											class="ghost small danger trash"
											aria-label={`Delete this Impression of ${imp.book.title}`}
											title="Delete"
											><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
												><path
													d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/></svg
											></button
										>
									</form>
								</div>
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
	/* Every row the same height: the cover's. The review is cut to fit. */
	.item {
		--cover-w: 3.75rem;
		display: grid;
		grid-template-columns: var(--cover-w) minmax(0, 1fr) auto;
		gap: 1rem;
		height: calc(var(--cover-w) * 1.5 + 2rem);
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
		box-sizing: border-box;
	}
	.item.open {
		height: auto;
		min-height: calc(var(--cover-w) * 1.5 + 2rem);
	}
	.item:last-child {
		border-bottom: none;
	}
	.cover-link img,
	.cover-none {
		display: block;
		width: var(--cover-w);
		height: calc(var(--cover-w) * 1.5);
		object-fit: cover;
		border-radius: var(--radius-sm);
		box-shadow: 0 0 0 1px var(--border);
	}
	.cover-none {
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
	}
	.body {
		min-width: 0;
		overflow: hidden;
	}
	.book {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}
	.book:hover .title {
		color: var(--accent);
	}
	.title,
	.byline {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.title {
		flex-shrink: 0;
		max-width: 70%;
		font-weight: 650;
	}
	.byline {
		min-width: 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.review-wrap {
		position: relative;
		margin-top: 0.35rem;
	}
	.review {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.45;
		color: var(--text-muted);
		white-space: pre-line;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.review.open {
		display: block;
		overflow: visible;
	}
	/* "more" sits over the end of the last line, fading the text under it. */
	.more {
		position: absolute;
		right: 0;
		bottom: 0;
		padding: 0 0 0 2.5rem;
		border: none;
		border-radius: 0;
		background: linear-gradient(to right, transparent, var(--bg) 2rem);
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 600;
		line-height: 1.45;
		cursor: pointer;
	}
	.more:hover {
		text-decoration: underline;
	}
	.more.open {
		position: static;
		padding: 0;
		background: none;
	}
	.side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		text-align: right;
	}
	time {
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.marks {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 1.2rem;
	}
	.icon {
		color: var(--accent);
		font-weight: 700;
		line-height: 1;
	}
	.icon.dnf {
		color: var(--text-muted);
	}
	.tools {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
		margin-top: auto;
		margin-right: -0.5rem;
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
	.trash {
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.4rem;
	}
	.edit {
		margin-top: 0.6rem;
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
