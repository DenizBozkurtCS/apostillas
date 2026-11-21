<!--
	The Book page. Reading content comes first: a header with the cover, status
	and actions, a short About, then tabs for Notes, Quotes and Reads. Managing
	the Book (details, cover, sync, delete) lives behind the ⋯ menu, in dialogs.

	Forms submit with `enhance`, so the page does not reload and the open tab
	stays put. A failed submit reopens the place it came from (its tab or dialog).
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { formatDay, formatRating, statusLabel } from '#lib/format';
	import Dialog from '#lib/components/Dialog.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import StarInput from '#lib/components/StarInput.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const book = $derived(data.book);
	const byline = $derived(book.authors.join(', ') || 'Unknown author');
	const isBookstack = $derived(data.status === 'Want to read');

	type Tab = 'notes' | 'quotes' | 'reads';
	type DialogName = 'details' | 'cover' | 'sync' | 'delete';

	/** Tabs on offer. A Bookstack Book has no Reads and can't take new
	 * annotations, so it only shows Notes/Quotes it kept from before. */
	const tabs = $derived.by(() => {
		const all: { id: Tab; label: string; count: number }[] = [
			{ id: 'notes', label: 'Notes', count: data.notes.length },
			{ id: 'quotes', label: 'Quotes', count: data.quotes.length },
			{ id: 'reads', label: 'Reads', count: data.reads.length }
		];
		return isBookstack ? all.filter((t) => t.id !== 'reads' && t.count > 0) : all;
	});

	let tab = $state<Tab>('notes');
	/** The tab actually shown: the chosen one if on offer, else the first. */
	const activeTab = $derived(tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id);

	/** Which status panel (Finish / Log past read) is open under the actions. */
	let panel = $state<'finish' | 'logPast' | null>(null);
	/** Which Read, Quote or Note is being edited in place, e.g. `quote-12`. */
	let editing = $state<string | null>(null);
	let addingQuote = $state(false);
	let addingNote = $state(false);
	let dialog = $state<DialogName | null>(null);
	let menuOpen = $state(false);
	let menu: HTMLElement | undefined = $state();

	// About: clamp long descriptions to a few lines, with a toggle when they overflow.
	let aboutEl: HTMLElement | undefined = $state();
	let aboutExpanded = $state(false);
	let aboutOverflows = $state(false);
	$effect(() => {
		void book.description;
		if (aboutEl && !aboutExpanded) aboutOverflows = aboutEl.scrollHeight > aboutEl.clientHeight + 1;
	});

	// Reopen whatever a failed submit came from.
	$effect(() => {
		if (form?.noteError) {
			tab = 'notes';
		} else if (form?.quoteError) {
			tab = 'quotes';
		} else if (form?.metaError) {
			dialog = 'details';
		} else if (form?.syncError) {
			dialog = 'sync';
		} else if (form?.coverError) {
			dialog = 'cover';
		}
	});
	// "Show edition covers" reloads with ?covers=1: show them in the cover dialog.
	// Only when they first appear, so refreshing data after a pick doesn't reopen it.
	let hadEditionCovers = false;
	$effect(() => {
		const has = data.editionCovers != null;
		if (has && !hadEditionCovers) dialog = 'cover';
		hadEditionCovers = has;
	});

	/**
	 * Submit with `enhance`: optionally confirm first, then refresh the page's
	 * data and, on success, run `done` (close the form or dialog).
	 */
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

	function togglePanel(p: 'finish' | 'logPast') {
		panel = panel === p ? null : p;
	}
	function toggleEdit(key: string) {
		editing = editing === key ? null : key;
	}
	function openDialog(name: DialogName) {
		menuOpen = false;
		dialog = name;
	}
	function setDialogOpen(name: DialogName, open: boolean) {
		dialog = open ? name : dialog === name ? null : dialog;
	}

	function onWindowClick(event: MouseEvent) {
		if (menuOpen && menu && !menu.contains(event.target as Node)) menuOpen = false;
	}
	function onWindowKeydown(event: KeyboardEvent) {
		if (menuOpen && event.key === 'Escape') menuOpen = false;
	}

	/** Left/Right/Home/End move between tabs (WAI-ARIA tabs pattern). */
	function onTabKeydown(event: KeyboardEvent) {
		const i = tabs.findIndex((t) => t.id === activeTab);
		let next = i;
		if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = tabs.length - 1;
		else return;
		event.preventDefault();
		tab = tabs[next].id;
		document.getElementById(`tab-${tab}`)?.focus();
	}

	/** Human label for a Read's outcome. */
	function outcomeLabel(outcome: 'open' | 'finished' | 'abandoned'): string {
		return outcome === 'open' ? 'Reading' : outcome === 'finished' ? 'Finished' : 'Abandoned';
	}

	/** Short label for a Read, used in the "link to Read" picker and annotations. */
	function readLabel(r: PageData['reads'][number]): string {
		const dates = [r.startDate, r.endDate].filter(Boolean).map(formatDay).join(' – ');
		return dates ? `${outcomeLabel(r.outcome)} · ${dates}` : outcomeLabel(r.outcome);
	}

	/** The label of the Read an annotation is linked to, or '' when unlinked. */
	function readLabelFor(readId: number | null): string {
		if (readId == null) return '';
		const r = data.reads.find((x) => x.id === readId);
		return r ? readLabel(r) : '';
	}
</script>

<svelte:head>
	<title>{book.title} · apostillas</title>
</svelte:head>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

{#snippet readLinkField(selected: number | null)}
	{#if data.reads.length > 0}
		<label class="field">
			<span>Linked Read (optional)</span>
			<select name="readId">
				<option value="" selected={selected == null}>Not linked to a Read</option>
				{#each data.reads as r (r.id)}
					<option value={r.id} selected={selected === r.id}>{readLabel(r)}</option>
				{/each}
			</select>
		</label>
	{/if}
{/snippet}

{#snippet itemTools(key: string, deleteAction: string, idName: string, id: number, message: string)}
	<div class="tools">
		<button
			type="button"
			class="ghost small"
			aria-expanded={editing === key}
			onclick={() => toggleEdit(key)}>{editing === key ? 'Cancel' : 'Edit'}</button
		>
		<form method="POST" action={deleteAction} use:enhance={submit({ confirm: message })}>
			<input type="hidden" name={idName} value={id} />
			<button type="submit" class="ghost small danger">Delete</button>
		</form>
	</div>
{/snippet}

<article class="book">
	<header class="hero">
		{#if book.coverPath}
			<img class="cover" src={`/${book.coverPath}`} alt="" width="200" height="300" />
		{:else}
			<div class="cover cover--none" aria-hidden="true"><span>{book.title}</span></div>
		{/if}

		<div class="meta">
			<div class="top-line">
				<span class="badge">{statusLabel(data.status)}</span>
				<div class="more" bind:this={menu}>
					<button
						type="button"
						class="ghost more-button"
						aria-label="More actions"
						aria-haspopup="menu"
						aria-expanded={menuOpen}
						onclick={() => (menuOpen = !menuOpen)}
						><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
							><circle cx="5" cy="12" r="1.8" fill="currentColor" /><circle
								cx="12"
								cy="12"
								r="1.8"
								fill="currentColor"
							/><circle cx="19" cy="12" r="1.8" fill="currentColor" /></svg
						></button
					>
					{#if menuOpen}
						<div class="menu" role="menu">
							<button type="button" role="menuitem" onclick={() => openDialog('details')}
								>Edit details</button
							>
							<button type="button" role="menuitem" onclick={() => openDialog('cover')}
								>Change cover</button
							>
							{#if book.workId}
								<button type="button" role="menuitem" onclick={() => openDialog('sync')}
									>Sync from Open Library</button
								>
							{/if}
							<hr />
							<button
								type="button"
								role="menuitem"
								class="danger-item"
								onclick={() => openDialog('delete')}>Delete book</button
							>
						</div>
					{/if}
				</div>
			</div>
			<h1>{book.title}</h1>
			<p class="byline">{byline}</p>
			{#if data.rating != null}
				<p class="rating">
					<Stars rating={data.rating} />
					<span class="rating-value" aria-hidden="true">{formatRating(data.rating)}</span>
				</p>
			{/if}
			<p class="facts">
				{#if book.pageCount}<span>{book.pageCount} pages</span>{/if}
				{#if book.isbn}<span>ISBN {book.isbn}</span>{/if}
				<span>Added {formatDay(book.createdAt)}</span>
			</p>
			{#if book.whyRecommended}
				<p class="why">“{book.whyRecommended}”</p>
			{/if}

			<!-- Actions by Reading Status -->
			<div class="actions">
				{#if isBookstack}
					<form method="POST" action="?/start" use:enhance={submit()}>
						<button type="submit" class="primary">Start reading</button>
					</form>
					<button
						type="button"
						aria-expanded={panel === 'logPast'}
						onclick={() => togglePanel('logPast')}>Log past read</button
					>
				{:else if data.status === 'Reading'}
					<button
						type="button"
						class="primary"
						aria-expanded={panel === 'finish'}
						onclick={() => togglePanel('finish')}>Finish</button
					>
					<form method="POST" action="?/abandon" use:enhance={submit()}>
						<button type="submit">Abandon</button>
					</form>
					<form
						method="POST"
						action="?/backToWant"
						use:enhance={submit({
							confirm: `${book.title} will go back to Bookstack. Its open Read is removed; Quotes and Notes stay.`
						})}
					>
						<button type="submit" class="ghost">Back to Bookstack</button>
					</form>
				{:else}
					<form method="POST" action="?/start" use:enhance={submit()}>
						<button type="submit" class="primary">Start again</button>
					</form>
				{/if}
			</div>

			{#if panel === 'logPast' && isBookstack}
				<form
					method="POST"
					action="?/logPast"
					class="stack panel"
					use:enhance={submit({ done: () => (panel = null) })}
				>
					<label class="field">
						<span>Finished on</span>
						<input name="endDate" type="date" required />
					</label>
					<div class="field">
						<span>Rating</span>
						<StarInput />
					</div>
					<label class="check">
						<input name="readBefore" type="checkbox" />
						<span>I've read this before</span>
					</label>
					<button type="submit" class="primary">Log past read</button>
				</form>
			{:else if panel === 'finish' && data.status === 'Reading'}
				<form
					method="POST"
					action="?/finish"
					class="stack panel"
					use:enhance={submit({ done: () => (panel = null) })}
				>
					<label class="field">
						<span>Finished on</span>
						<input name="endDate" type="date" />
						<small>Leave blank for today.</small>
					</label>
					<div class="field">
						<span>Rating</span>
						<StarInput />
					</div>
					<label class="check">
						<input name="readBefore" type="checkbox" />
						<span>I've read this before</span>
					</label>
					<button type="submit" class="primary">Finish</button>
				</form>
			{/if}

			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}
		</div>
	</header>

	{#if book.description}
		<section class="about" aria-labelledby="about-heading">
			<h2 id="about-heading" class="eyebrow">About</h2>
			<p class="description" class:clamped={!aboutExpanded} bind:this={aboutEl}>
				{book.description}
			</p>
			{#if aboutOverflows || aboutExpanded}
				<button
					type="button"
					class="ghost small more-toggle"
					aria-expanded={aboutExpanded}
					onclick={() => (aboutExpanded = !aboutExpanded)}
					>{aboutExpanded ? 'Show less' : 'Show more'}</button
				>
			{/if}
		</section>
	{/if}

	{#if tabs.length > 0}
		<section class="tabbed">
			<div class="tablist" role="tablist" aria-label="Book content" tabindex="-1" onkeydown={onTabKeydown}>
				{#each tabs as t (t.id)}
					<button
						type="button"
						role="tab"
						id={`tab-${t.id}`}
						aria-selected={activeTab === t.id}
						aria-controls={`panel-${t.id}`}
						tabindex={activeTab === t.id ? 0 : -1}
						onclick={() => (tab = t.id)}
					>
						{t.label}
						<span class="tab-count">{t.count}</span>
					</button>
				{/each}
			</div>

			<!-- Notes -->
			{#if activeTab === 'notes'}
				<div class="tabpanel" role="tabpanel" id="panel-notes" aria-labelledby="tab-notes">
					{#if form?.noteError}
						<p class="error" role="alert">{form.noteError}</p>
					{/if}

					{#if data.canAnnotate}
						{#if addingNote}
							<form
								method="POST"
								action="?/addNote"
								class="stack panel wide"
								use:enhance={submit({ done: () => (addingNote = false) })}
							>
								<label class="field">
									<span>Note (Markdown)</span>
									<!-- svelte-ignore a11y_autofocus -->
									<textarea name="body" rows="6" required autofocus></textarea>
								</label>
								{@render readLinkField(data.defaultReadId)}
								<div class="form-actions">
									<button type="submit" class="primary small">Add Note</button>
									<button type="button" class="ghost small" onclick={() => (addingNote = false)}
										>Cancel</button
									>
								</div>
							</form>
						{:else}
							<button type="button" class="small adder" onclick={() => (addingNote = true)}
								>+ Add a Note</button
							>
						{/if}
					{:else}
						<p class="muted hint">Start this Book to add Notes. Existing Notes stay here.</p>
					{/if}

					{#if data.notes.length === 0}
						<p class="muted empty">No Notes yet.</p>
					{:else}
						<ul class="items">
							{#each data.notes as n (n.id)}
								{@const key = `note-${n.id}`}
								<li class="item">
									{#if editing === key}
										<form
											method="POST"
											action="?/editNote"
											class="stack edit"
											use:enhance={submit({ done: () => (editing = null) })}
										>
											<input type="hidden" name="noteId" value={n.id} />
											<label class="field">
												<span>Note (Markdown)</span>
												<textarea name="body" rows="6" required>{n.body}</textarea>
											</label>
											{@render readLinkField(n.readId)}
											<div class="form-actions">
												<button type="submit" class="primary small">Save</button>
												<button type="button" class="ghost small" onclick={() => (editing = null)}
													>Cancel</button
												>
											</div>
										</form>
									{:else}
										<!-- Sanitised server-side in src/lib/markdown.ts (HTML-escaped by construction). -->
										<div class="note-body">{@html n.html}</div>
										<div class="item-row">
											<div class="item-meta">
												{#if readLabelFor(n.readId)}<span>↳ {readLabelFor(n.readId)}</span>{/if}
											</div>
											{@render itemTools(key, '?/deleteNote', 'noteId', n.id, 'Delete this Note?')}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}

			<!-- Quotes -->
			{#if activeTab === 'quotes'}
				<div class="tabpanel" role="tabpanel" id="panel-quotes" aria-labelledby="tab-quotes">
					{#if form?.quoteError}
						<p class="error" role="alert">{form.quoteError}</p>
					{/if}

					{#if data.canAnnotate}
						{#if addingQuote}
							<form
								method="POST"
								action="?/addQuote"
								class="stack panel wide"
								use:enhance={submit({ done: () => (addingQuote = false) })}
							>
								<label class="field">
									<span>Quote</span>
									<!-- svelte-ignore a11y_autofocus -->
									<textarea name="text" rows="3" required autofocus></textarea>
								</label>
								<label class="field">
									<span>Page or location (optional)</span>
									<input name="location" type="text" />
								</label>
								{@render readLinkField(data.defaultReadId)}
								<div class="form-actions">
									<button type="submit" class="primary small">Add Quote</button>
									<button type="button" class="ghost small" onclick={() => (addingQuote = false)}
										>Cancel</button
									>
								</div>
							</form>
						{:else}
							<button type="button" class="small adder" onclick={() => (addingQuote = true)}
								>+ Add a Quote</button
							>
						{/if}
					{:else}
						<p class="muted hint">Start this Book to add Quotes. Existing Quotes stay here.</p>
					{/if}

					{#if data.quotes.length === 0}
						<p class="muted empty">No Quotes yet.</p>
					{:else}
						<ul class="items">
							{#each data.quotes as q (q.id)}
								{@const key = `quote-${q.id}`}
								<li class="item">
									{#if editing === key}
										<form
											method="POST"
											action="?/editQuote"
											class="stack edit"
											use:enhance={submit({ done: () => (editing = null) })}
										>
											<input type="hidden" name="quoteId" value={q.id} />
											<label class="field">
												<span>Quote</span>
												<textarea name="text" rows="3" required>{q.text}</textarea>
											</label>
											<label class="field">
												<span>Page or location (optional)</span>
												<input name="location" type="text" value={q.location ?? ''} />
											</label>
											{@render readLinkField(q.readId)}
											<div class="form-actions">
												<button type="submit" class="primary small">Save</button>
												<button type="button" class="ghost small" onclick={() => (editing = null)}
													>Cancel</button
												>
											</div>
										</form>
									{:else}
										<blockquote class="quote-text">{q.text}</blockquote>
										<div class="item-row">
											<div class="item-meta">
												{#if q.location}<span>{q.location}</span>{/if}
												{#if readLabelFor(q.readId)}<span>↳ {readLabelFor(q.readId)}</span>{/if}
											</div>
											{@render itemTools(key, '?/deleteQuote', 'quoteId', q.id, 'Delete this Quote?')}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}

			<!-- Reads -->
			{#if activeTab === 'reads'}
				<div class="tabpanel" role="tabpanel" id="panel-reads" aria-labelledby="tab-reads">
					{#if data.reads.length === 0}
						<p class="muted empty">No Reads yet.</p>
					{:else}
						<ul class="items">
							{#each data.reads as r (r.id)}
								{@const key = `read-${r.id}`}
								<li class="item">
									<div class="item-row">
										<div class="read-line">
											<span class="outcome" data-outcome={r.outcome}>{outcomeLabel(r.outcome)}</span>
											<span class="muted">
												{#if r.startDate}{formatDay(r.startDate)}{/if}
												{#if r.startDate && r.endDate}&ndash;{/if}
												{#if r.endDate}{formatDay(r.endDate)}{/if}
												{#if r.outcome === 'finished' && !r.startDate && !r.endDate}date unknown{/if}
											</span>
											{#if r.outcome === 'finished' && (r.startDate || r.endDate)}
												<!-- Clears both dates: the Read becomes "date unknown" (read long ago). -->
												<form method="POST" action="?/editRead" class="inline" use:enhance={submit()}>
													<input type="hidden" name="readId" value={r.id} />
													<input type="hidden" name="startDate" value="" />
													<input type="hidden" name="endDate" value="" />
													<button
														type="submit"
														class="ghost small clear-dates"
														title="Remove the dates"
														aria-label="Remove the dates">×</button
													>
												</form>
											{/if}
											{#if r.rating != null}
												<Stars rating={r.rating} />
											{/if}
											{#if r.isReread}
												<span class="reread" title="Reread">↻ Reread</span>
											{/if}
										</div>
										{@render itemTools(key, '?/deleteRead', 'readId', r.id, r.deleteMessage)}
									</div>

									{#if editing === key}
										<form
											method="POST"
											action="?/editRead"
											class="stack edit"
											use:enhance={submit({ done: () => (editing = null) })}
										>
											<input type="hidden" name="readId" value={r.id} />
											<div class="row">
												{#if r.outcome !== 'finished' || r.startDate !== null}
													<label class="field">
														<span>Started on</span>
														<input name="startDate" type="date" value={r.startDate ?? ''} />
													</label>
												{/if}
												{#if r.outcome !== 'open'}
													<label class="field">
														<span>Ended on</span>
														<input name="endDate" type="date" value={r.endDate ?? ''} />
													</label>
												{/if}
											</div>
											<div class="field">
												<span>Rating</span>
												<StarInput value={r.rating} />
											</div>
											<button type="submit" class="primary small">Save</button>
										</form>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</section>
	{/if}
</article>

<!-- ⋯ menu dialogs -->

<Dialog title="Edit details" bind:open={() => dialog === 'details', (v) => setDialogOpen('details', v)}>
	<form
		method="POST"
		action="?/updateMeta"
		class="stack"
		use:enhance={submit({ done: () => (dialog = null) })}
	>
		{#if form?.metaError}
			<p class="error" role="alert">{form.metaError}</p>
		{/if}
		<label class="field">
			<span>Title</span>
			<input name="title" type="text" value={book.title} required />
		</label>
		<label class="field">
			<span>Author(s), separated by commas</span>
			<input name="authors" type="text" value={book.authors.join(', ')} />
		</label>
		<div class="row">
			<label class="field">
				<span>ISBN</span>
				<input name="isbn" type="text" value={book.isbn ?? ''} />
			</label>
			<label class="field">
				<span>Page count</span>
				<input name="pageCount" type="number" min="1" value={book.pageCount ?? ''} />
			</label>
		</div>
		<label class="field">
			<span>Description</span>
			<textarea name="description" rows="5">{book.description}</textarea>
		</label>
		<label class="field">
			<span>Why / recommended by</span>
			<input name="whyRecommended" type="text" value={book.whyRecommended ?? ''} />
		</label>
		<button type="submit" class="primary">Save details</button>
	</form>
</Dialog>

<Dialog title="Change cover" bind:open={() => dialog === 'cover', (v) => setDialogOpen('cover', v)}>
	<div class="stack">
		{#if form?.coverError}
			<p class="error" role="alert">{form.coverError}</p>
		{/if}

		<form
			method="POST"
			action="?/uploadCover"
			enctype="multipart/form-data"
			class="stack"
			use:enhance={submit({ done: () => (dialog = null) })}
		>
			<label class="field">
				<span>Upload an image (JPEG, PNG, GIF or WebP, max 5 MB)</span>
				<input name="cover" type="file" accept="image/jpeg,image/png,image/gif,image/webp" required />
			</label>
			<button type="submit" class="small">Upload cover</button>
		</form>

		{#if book.workId}
			<div class="editions">
				<p class="muted">Or pick the real cover from one of this work's editions:</p>
				{#if data.editionCovers == null}
					<a class="button small" href="?covers=1" data-sveltekit-noscroll>Show edition covers</a>
				{:else if data.editionCovers.length === 0}
					<p class="muted">No edition covers were found.</p>
				{:else}
					<ul class="edition-covers">
						{#each data.editionCovers as edition (edition.coverUrl)}
							<li>
								<form
									method="POST"
									action="?/pickCover"
									use:enhance={submit({ done: () => (dialog = null) })}
								>
									<input type="hidden" name="coverUrl" value={edition.coverUrl} />
									<button type="submit" class="edition-cover" title={edition.label}>
										<img src={edition.coverUrl} alt={edition.label} width="80" height="120" loading="lazy" />
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>
</Dialog>

<Dialog
	title="Sync from Open Library"
	bind:open={() => dialog === 'sync', (v) => setDialogOpen('sync', v)}
>
	<form
		method="POST"
		action="?/syncMeta"
		class="stack"
		use:enhance={submit({ done: () => (dialog = null) })}
	>
		{#if form?.syncError}
			<p class="error" role="alert">{form.syncError}</p>
		{/if}
		<p class="dialog-text">
			Replace the title, authors, description, ISBN and page count with Open Library's current data.
			“Why / recommended by” and the cover stay as they are.
		</p>
		<div class="form-actions">
			<button type="submit" class="primary">Sync details</button>
			<button type="button" class="ghost" onclick={() => (dialog = null)}>Cancel</button>
		</div>
	</form>
</Dialog>

<Dialog title="Delete this book?" bind:open={() => dialog === 'delete', (v) => setDialogOpen('delete', v)}>
	<form method="POST" action="?/deleteBook" class="stack" use:enhance={submit()}>
		<p class="dialog-text">
			<strong>{book.title}</strong> and its Reads, Quotes, and Notes will be deleted. This cannot be
			undone.
		</p>
		<div class="form-actions">
			<button type="submit" class="danger-solid">Delete book</button>
			<button type="button" class="ghost" onclick={() => (dialog = null)}>Cancel</button>
		</div>
	</form>
</Dialog>

<style>
	.book {
		max-width: var(--content-narrow);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* ---------- Hero ---------- */
	.hero {
		display: grid;
		grid-template-columns: 10rem 1fr;
		gap: 2rem;
		align-items: start;
	}
	.cover {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow:
			0 0 0 1px var(--border),
			0 6px 20px rgb(0 0 0 / 0.12);
	}
	.cover--none {
		display: flex;
		align-items: center;
		padding: 1rem;
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
		font-weight: 650;
		line-height: 1.25;
	}
	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
		min-width: 0;
	}
	.top-line {
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.meta h1 {
		font-size: 1.85rem;
		margin-top: 0.15rem;
	}
	.byline {
		margin: 0;
		font-size: 1.05rem;
		color: var(--text-muted);
	}
	.rating {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 1.35rem;
		line-height: 1;
	}
	.rating-value {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-muted);
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0;
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: var(--text-faint);
	}
	.facts span + span::before {
		content: '·';
		margin: 0 0.5rem;
	}
	.why {
		margin: 0.25rem 0 0;
		font-style: italic;
		color: var(--text-muted);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.actions form {
		margin: 0;
	}
	.panel {
		width: 100%;
		max-width: 22rem;
		margin-top: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.panel.wide {
		max-width: none;
		margin: 0 0 1rem;
	}

	/* ⋯ menu */
	.more {
		position: relative;
	}
	.more-button {
		padding: 0.3rem 0.45rem;
	}
	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 0.3rem);
		z-index: 5;
		min-width: 13rem;
		padding: 0.3rem;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-raised);
		box-shadow: var(--shadow);
	}
	.menu button {
		justify-content: flex-start;
		border: none;
		background: none;
		padding: 0.5rem 0.65rem;
		border-radius: var(--radius-sm);
		font-weight: 450;
	}
	.menu button:hover {
		background: var(--surface);
	}
	.menu .danger-item {
		color: var(--danger);
	}
	.menu .danger-item:hover {
		background: var(--danger-soft);
		color: var(--danger);
	}
	.menu hr {
		margin: 0.25rem 0.3rem;
		border: none;
		border-top: 1px solid var(--border);
	}

	@media (max-width: 36rem) {
		.hero {
			grid-template-columns: 7rem 1fr;
			gap: 1.25rem;
		}
		.meta h1 {
			font-size: 1.4rem;
		}
	}

	/* ---------- About ---------- */
	.eyebrow {
		font-size: 0.75rem;
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-faint);
		margin-bottom: 0.4rem;
	}
	.description {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.65;
		color: var(--text-muted);
	}
	.description.clamped {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.more-toggle {
		margin: 0.2rem 0 0 -0.5rem;
		color: var(--accent);
	}

	/* ---------- Tabs ---------- */
	.tablist {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid var(--border);
		margin-bottom: 1.1rem;
	}
	[role='tab'] {
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		background: none;
		margin-bottom: -1px;
		padding: 0.55rem 0.8rem;
		color: var(--text-muted);
		font-size: 0.95rem;
		font-weight: 550;
	}
	[role='tab']:hover {
		background: none;
		color: var(--text);
	}
	[role='tab'][aria-selected='true'] {
		color: var(--text);
		border-bottom-color: var(--accent);
	}
	.tab-count {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-faint);
		background: var(--surface);
		border-radius: 999px;
		padding: 0 0.45rem;
	}
	[role='tab'][aria-selected='true'] .tab-count {
		color: var(--accent);
		background: var(--accent-soft);
	}
	.adder {
		margin-bottom: 0.5rem;
	}
	.hint,
	.empty {
		font-size: 0.92rem;
	}

	/* ---------- Items ---------- */
	.items {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	.item {
		padding: 0.85rem 0;
		border-bottom: 1px solid var(--border);
	}
	.item:last-child {
		border-bottom: none;
	}
	.item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		min-height: 2rem;
	}
	.tools {
		display: flex;
		gap: 0.1rem;
		flex-shrink: 0;
		opacity: 0.6;
		transition: opacity 0.12s;
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
	.tools form,
	form.inline {
		margin: 0;
		display: inline;
	}
	.edit {
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
	}
	.item-row + .edit {
		margin-top: 0.6rem;
	}
	.form-actions {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.read-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.75rem;
		font-size: 0.95rem;
	}
	.outcome {
		font-weight: 600;
	}
	.outcome[data-outcome='open'] {
		color: var(--accent);
	}
	.outcome[data-outcome='abandoned'] {
		color: var(--text-muted);
	}
	.clear-dates {
		padding: 0 0.35rem;
		margin-left: -0.5rem;
		line-height: 1.2;
		color: var(--text-faint);
	}
	.reread {
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.item-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.9rem;
		font-size: 0.82rem;
		color: var(--text-faint);
	}
	.quote-text {
		margin: 0 0 0.35rem;
		padding-left: 1rem;
		border-left: 3px solid var(--accent);
		white-space: pre-wrap;
		font-size: 1.02rem;
		line-height: 1.6;
	}
	.note-body {
		line-height: 1.6;
		margin-bottom: 0.35rem;
	}
	.note-body :global(p) {
		margin: 0 0 0.6rem;
	}
	.note-body :global(:last-child) {
		margin-bottom: 0;
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

	/* ---------- Dialog content ---------- */
	.dialog-text {
		margin: 0;
		line-height: 1.55;
		color: var(--text-muted);
	}
	.danger-solid {
		background: var(--danger);
		border-color: var(--danger);
		color: #fff;
	}
	.danger-solid:hover {
		background: var(--danger);
		filter: brightness(0.92);
		color: #fff;
	}
	.editions p {
		margin: 0 0 0.6rem;
		font-size: 0.9rem;
	}
	.edition-covers {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.edition-covers form {
		margin: 0;
	}
	.edition-cover {
		padding: 0;
		border: 2px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
	}
	.edition-cover:hover {
		border-color: var(--accent);
		background: none;
	}
	.edition-cover img {
		display: block;
		width: 80px;
		height: 120px;
		object-fit: cover;
		background: var(--surface);
		border-radius: 2px;
	}
</style>
