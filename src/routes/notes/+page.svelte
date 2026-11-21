<!--
	Notes & Quotes (apostillas-v2/02): everything the reader has written, newest
	first, in two columns (a wider one for Notes, one for Quotes). Each column
	shows the latest PAGE items with "See all" for the rest; on phones a switch
	shows one column at a time.

	The search box filters both columns as you type. It calls /notes/search, so
	the page's URL stays /notes. While searching there is no limit, and cards
	show the highlighted excerpt instead of the full text.

	New Quotes and Notes pick their Book first; edits and deletes happen in place.
	Forms submit with `enhance`, so nothing reloads.
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Clamp from '#lib/components/Clamp.svelte';
	import MarkdownEditor from '#lib/components/MarkdownEditor.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/** How many of each kind the two-column view shows before "See all". */
	const PAGE = 10;

	type Kind = 'note' | 'quote';
	type Note = PageData['notes'][number];
	type Quote = PageData['quotes'][number];

	let view = $state<'both' | 'notes' | 'quotes'>('both');
	let mobileTab = $state<'notes' | 'quotes'>('notes');
	let composing = $state<Kind | null>(null);
	let editing = $state<string | null>(null);

	// ---------- Search ----------
	let query = $state('');
	/** Ranked hits for the current query (null when not searching). */
	let hits = $state<{ kind: Kind; refId: number; snippetHtml: string }[] | null>(null);
	let searchSeq = 0;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const searching = $derived(hits !== null);

	async function runSearch(q: string) {
		const seq = ++searchSeq;
		if (q.trim() === '') {
			hits = null;
			return;
		}
		const res = await fetch(`/notes/search?q=${encodeURIComponent(q)}`);
		if (!res.ok || seq !== searchSeq) return;
		const body: { hits: { kind: Kind; refId: number; snippetHtml: string }[] } = await res.json();
		if (seq === searchSeq) hits = body.hits;
	}

	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => runSearch(query), 250);
	}

	function clearSearch() {
		query = '';
		clearTimeout(searchTimer);
		runSearch('');
	}

	/** Snippet for a card while searching, keyed `note-12` / `quote-3`. */
	const snippets = $derived(new Map((hits ?? []).map((h) => [`${h.kind}-${h.refId}`, h.snippetHtml])));

	/** Items of one kind in search-rank order, or all of them when not searching. */
	function matching<T extends { id: number }>(items: T[], kind: Kind): T[] {
		if (!hits) return items;
		const byId = new Map(items.map((i) => [i.id, i]));
		return hits.filter((h) => h.kind === kind).flatMap((h) => byId.get(h.refId) ?? []);
	}

	const notes = $derived(matching(data.notes, 'note'));
	const quotes = $derived(matching(data.quotes, 'quote'));
	const limited = $derived(!searching && view === 'both');
	const shownNotes = $derived(limited ? notes.slice(0, PAGE) : notes);
	const shownQuotes = $derived(limited ? quotes.slice(0, PAGE) : quotes);

	// ---------- Composing ----------
	let composeBookId = $state<number | null>(null);
	const composeBook = $derived(data.books.find((b) => b.id === composeBookId) ?? null);

	function startComposing(kind: Kind) {
		editing = null;
		composing = composing === kind ? null : kind;
	}

	// ---------- Forms ----------
	/** Submit with `enhance`: confirm first if asked; on success refresh and run `done`. */
	function submit(opts: { confirm?: string; done?: () => void } = {}): SubmitFunction {
		return ({ cancel }) => {
			if (opts.confirm && !confirm(opts.confirm)) {
				cancel();
				return;
			}
			return async ({ result, update }) => {
				await update({ reset: result.type === 'success' });
				if (result.type === 'success') {
					opts.done?.();
					if (searching) runSearch(query);
				}
			};
		};
	}

	// A failed add reopens its composer.
	$effect(() => {
		if (form?.noteError && !editing) composing = 'note';
		else if (form?.quoteError && !editing) composing = 'quote';
	});

	function seeAll(which: 'notes' | 'quotes') {
		view = which;
		composing = null;
		window.scrollTo({ top: 0 });
	}
</script>

<svelte:head>
	<title>Notes & Quotes · apostillas</title>
</svelte:head>

{#snippet bookLink(book: Note['book'])}
	<a class="card-book" href={`/books/${book.id}`}>
		{#if book.coverPath}
			<img src={`/${book.coverPath}`} alt="" width="24" height="36" loading="lazy" />
		{:else}
			<span class="mini-cover" aria-hidden="true"></span>
		{/if}
		<span class="card-book-title">{book.title}</span>
	</a>
{/snippet}

{#snippet bookPicker()}
	{#if data.books.length === 0}
		<p class="muted">Start reading a Book to write about it.</p>
	{:else}
		<label class="field">
			<span>Book</span>
			<select name="bookId" required bind:value={composeBookId}>
				<option value={null} disabled>Choose a Book…</option>
				{#each data.books as b (b.id)}
					<option value={b.id}>{b.title}{b.authors.length ? ` — ${b.authors.join(', ')}` : ''}</option>
				{/each}
			</select>
		</label>
	{/if}
{/snippet}

{#snippet tools(key: string, action: string, idName: string, item: Note | Quote, message: string)}
	<div class="tools">
		<button
			type="button"
			class="ghost small"
			aria-expanded={editing === key}
			onclick={() => {
				composing = null;
				editing = editing === key ? null : key;
			}}>{editing === key ? 'Cancel' : 'Edit'}</button
		>
		<form method="POST" {action} use:enhance={submit({ confirm: message })}>
			<input type="hidden" name="bookId" value={item.book.id} />
			<input type="hidden" name={idName} value={item.id} />
			<button type="submit" class="ghost small danger">Delete</button>
		</form>
	</div>
{/snippet}

<div class="page">
	<div class="page-head">
		<h1>Notes & Quotes</h1>
	</div>

	<div class="search" role="search">
		<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
			><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" /><path
				d="M20 20l-3.5-3.5"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/></svg
		>
		<input
			type="search"
			bind:value={query}
			oninput={onSearchInput}
			onkeydown={(e) => e.key === 'Escape' && clearSearch()}
			placeholder="Search your Notes and Quotes"
			aria-label="Search your Notes and Quotes"
		/>
	</div>
	{#if searching}
		<p class="result-count" aria-live="polite">
			{notes.length + quotes.length}
			{notes.length + quotes.length === 1 ? 'match' : 'matches'} for “{query.trim()}”
			<button type="button" class="ghost small" onclick={clearSearch}>Clear</button>
		</p>
	{/if}

	{#if view !== 'both'}
		<button type="button" class="ghost back" onclick={() => (view = 'both')}
			>← Back to Notes & Quotes</button
		>
	{:else}
		<div class="switch" role="tablist" aria-label="Show">
			<button
				type="button"
				role="tab"
				aria-selected={mobileTab === 'notes'}
				onclick={() => (mobileTab = 'notes')}>Notes <span class="count">{notes.length}</span></button
			>
			<button
				type="button"
				role="tab"
				aria-selected={mobileTab === 'quotes'}
				onclick={() => (mobileTab = 'quotes')}>Quotes <span class="count">{quotes.length}</span></button
			>
		</div>
	{/if}

	<div class="columns" class:single={view !== 'both'}>
		<!-- Notes -->
		{#if view !== 'quotes'}
			<section
				class="column"
				class:off-mobile={view === 'both' && mobileTab !== 'notes'}
				aria-labelledby="notes-heading"
			>
				<div class="column-head">
					<h2 id="notes-heading">Notes <span class="count">{notes.length}</span></h2>
					<button
						type="button"
						class="small"
						class:primary={composing !== 'note'}
						aria-expanded={composing === 'note'}
						onclick={() => startComposing('note')}
						>{composing === 'note' ? 'Cancel' : '+ New Note'}</button
					>
				</div>

				{#if form?.noteError}
					<p class="error" role="alert">{form.noteError}</p>
				{/if}

				{#if composing === 'note'}
					<form
						method="POST"
						action="?/addNote"
						class="stack composer"
						use:enhance={submit({ done: () => (composing = null) })}
					>
						{@render bookPicker()}
						{#if composeBook}
							<MarkdownEditor autofocus />
							<button type="submit" class="primary small">Add Note</button>
						{/if}
					</form>
				{/if}

				{#if shownNotes.length === 0}
					<p class="muted empty">{searching ? 'No Notes match.' : 'No Notes yet.'}</p>
				{:else}
					<ul class="cards">
						{#each shownNotes as n (n.id)}
							{@const key = `note-${n.id}`}
							<li class="card">
								{@render bookLink(n.book)}
								{#if editing === key}
									<form
										method="POST"
										action="?/editNote"
										class="stack edit"
										use:enhance={submit({ done: () => (editing = null) })}
									>
										<input type="hidden" name="bookId" value={n.book.id} />
										<input type="hidden" name="noteId" value={n.id} />
										<MarkdownEditor value={n.body} />
										<div class="form-actions">
											<button type="submit" class="primary small">Save</button>
											<button type="button" class="ghost small" onclick={() => (editing = null)}
												>Cancel</button
											>
										</div>
									</form>
								{:else}
									{#if searching && snippets.get(key)}
										<!-- Escaped server-side with <mark> around matches. -->
										<p class="snippet">{@html snippets.get(key)}</p>
									{:else}
										<Clamp lines={6}>
											<!-- Sanitised server-side in src/lib/markdown.ts. -->
											<div class="note-body">{@html n.html}</div>
										</Clamp>
									{/if}
									{@render tools(key, '?/deleteNote', 'noteId', n, 'Delete this Note?')}
								{/if}
							</li>
						{/each}
					</ul>
					{#if limited && notes.length > PAGE}
						<button type="button" class="see-all" onclick={() => seeAll('notes')}
							>See all Notes ({notes.length}) →</button
						>
					{/if}
				{/if}
			</section>
		{/if}

		<!-- Quotes -->
		{#if view !== 'notes'}
			<section
				class="column"
				class:off-mobile={view === 'both' && mobileTab !== 'quotes'}
				aria-labelledby="quotes-heading"
			>
				<div class="column-head">
					<h2 id="quotes-heading">Quotes <span class="count">{quotes.length}</span></h2>
					<button
						type="button"
						class="small"
						class:primary={composing !== 'quote'}
						aria-expanded={composing === 'quote'}
						onclick={() => startComposing('quote')}
						>{composing === 'quote' ? 'Cancel' : '+ New Quote'}</button
					>
				</div>

				{#if form?.quoteError}
					<p class="error" role="alert">{form.quoteError}</p>
				{/if}

				{#if composing === 'quote'}
					<form
						method="POST"
						action="?/addQuote"
						class="stack composer"
						use:enhance={submit({ done: () => (composing = null) })}
					>
						{@render bookPicker()}
						{#if composeBook}
							<label class="field">
								<span>Quote</span>
								<!-- svelte-ignore a11y_autofocus -->
								<textarea name="text" rows="3" required autofocus></textarea>
							</label>
							<label class="field">
								<span>Page or location (optional)</span>
								<input name="location" type="text" />
							</label>
							<button type="submit" class="primary small">Add Quote</button>
						{/if}
					</form>
				{/if}

				{#if shownQuotes.length === 0}
					<p class="muted empty">{searching ? 'No Quotes match.' : 'No Quotes yet.'}</p>
				{:else}
					<ul class="cards">
						{#each shownQuotes as q (q.id)}
							{@const key = `quote-${q.id}`}
							<li class="card">
								{@render bookLink(q.book)}
								{#if editing === key}
									<form
										method="POST"
										action="?/editQuote"
										class="stack edit"
										use:enhance={submit({ done: () => (editing = null) })}
									>
										<input type="hidden" name="bookId" value={q.book.id} />
										<input type="hidden" name="quoteId" value={q.id} />
										<label class="field">
											<span>Quote</span>
											<textarea name="text" rows="3" required>{q.text}</textarea>
										</label>
										<label class="field">
											<span>Page or location (optional)</span>
											<input name="location" type="text" value={q.location ?? ''} />
										</label>
										<div class="form-actions">
											<button type="submit" class="primary small">Save</button>
											<button type="button" class="ghost small" onclick={() => (editing = null)}
												>Cancel</button
											>
										</div>
									</form>
								{:else}
									{#if searching && snippets.get(key)}
										<!-- Escaped server-side with <mark> around matches. -->
										<blockquote class="quote-text">{@html snippets.get(key)}</blockquote>
									{:else}
										<blockquote class="quote-text">{q.text}</blockquote>
									{/if}
									<div class="card-foot">
										{#if q.location}<span class="location">{q.location}</span>{/if}
										{@render tools(key, '?/deleteQuote', 'quoteId', q, 'Delete this Quote?')}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					{#if limited && quotes.length > PAGE}
						<button type="button" class="see-all" onclick={() => seeAll('quotes')}
							>See all Quotes ({quotes.length}) →</button
						>
					{/if}
				{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	.page {
		max-width: var(--content);
		margin: 0 auto;
	}
	.page-head {
		margin-bottom: 1rem;
	}

	/* ---------- Search ---------- */
	.search {
		position: relative;
		max-width: 32rem;
	}
	.search input {
		padding: 0.6rem 0.8rem 0.6rem 2.2rem;
		font-size: 1rem;
		border-radius: 999px;
	}
	.search-icon {
		position: absolute;
		left: 0.8rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-faint);
		pointer-events: none;
	}
	.result-count {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.75rem 0 0;
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	.back {
		margin-top: 1rem;
		padding-left: 0;
		color: var(--accent);
	}

	/* ---------- Phone switch ---------- */
	.switch {
		display: none;
		margin-top: 1.25rem;
		padding: 0.25rem;
		gap: 0.25rem;
		border-radius: var(--radius);
		background: var(--surface);
	}
	.switch button {
		flex: 1;
		border: none;
		background: none;
		color: var(--text-muted);
	}
	.switch button[aria-selected='true'] {
		background: var(--surface-raised);
		color: var(--text);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
	}

	/* ---------- Columns ---------- */
	.columns {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: 3rem;
		margin-top: 2rem;
		align-items: start;
	}
	.columns.single {
		grid-template-columns: minmax(0, 1fr);
		max-width: var(--content-narrow);
		margin-top: 1rem;
	}
	@media (max-width: 52rem) {
		.switch {
			display: flex;
		}
		.columns {
			grid-template-columns: minmax(0, 1fr);
			margin-top: 1rem;
		}
		.column.off-mobile {
			display: none;
		}
	}
	.column-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.6rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}
	.count {
		color: var(--text-faint);
		font-size: 0.85em;
		font-weight: 500;
	}
	.composer {
		margin: 0.75rem 0 1rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.empty {
		font-size: 0.92rem;
	}

	/* ---------- Cards ---------- */
	.cards {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.card {
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
	}
	.card:last-child {
		border-bottom: none;
	}
	.card-book {
		display: flex;
		width: fit-content;
		max-width: 100%;
		min-width: 0;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		color: var(--text-muted);
		font-size: 0.82rem;
		font-weight: 600;
		text-decoration: none;
	}
	.card-book:hover {
		color: var(--accent);
	}
	.card-book img,
	.mini-cover {
		width: 20px;
		height: 30px;
		object-fit: cover;
		border-radius: 2px;
		box-shadow: 0 0 0 1px var(--border);
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
		flex-shrink: 0;
	}
	.card-book-title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.note-body {
		line-height: 1.6;
	}
	.note-body :global(p) {
		margin: 0 0 0.6rem;
	}
	.note-body :global(:last-child) {
		margin-bottom: 0;
	}
	.note-body :global(h1),
	.note-body :global(h2),
	.note-body :global(h3) {
		font-size: 1.05rem;
		margin: 0 0 0.4rem;
	}
	.note-body :global(code) {
		font-family: var(--font-mono);
		font-size: 0.88em;
		background: var(--surface);
		padding: 0.1em 0.3em;
		border-radius: var(--radius-sm);
	}
	.note-body :global(pre) {
		background: var(--surface);
		padding: 0.75rem;
		border-radius: var(--radius);
		overflow-x: auto;
	}
	.note-body :global(pre code) {
		background: none;
		padding: 0;
	}
	.note-body :global(blockquote) {
		margin: 0 0 0.6rem;
		padding-left: 0.9rem;
		border-left: 3px solid var(--border-strong);
		color: var(--text-muted);
	}
	.snippet {
		margin: 0;
		line-height: 1.6;
	}
	.snippet :global(mark),
	.quote-text :global(mark) {
		background: var(--mark);
		color: inherit;
		border-radius: 2px;
		padding: 0 1px;
	}
	.quote-text {
		margin: 0;
		padding-left: 0.9rem;
		border-left: 3px solid var(--accent);
		white-space: pre-wrap;
		line-height: 1.6;
	}
	.card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.3rem;
	}
	.location {
		font-size: 0.82rem;
		color: var(--text-faint);
	}
	.tools {
		display: flex;
		justify-content: flex-end;
		gap: 0.1rem;
		margin-left: auto;
		opacity: 0.6;
		transition: opacity 0.12s;
	}
	.card:hover .tools,
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
		gap: 0.4rem;
	}
	.see-all {
		margin-top: 0.75rem;
		width: 100%;
		color: var(--accent);
	}
</style>
