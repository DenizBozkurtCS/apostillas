<!--
	The Book page. Reading content comes first: a header with the cover and the
	action panel (Reading Status switches, stars, and buttons that open the
	Impression / Note / Quote forms; ADR-0006), a short About, then tabs for
	Impressions (shown first), Notes and Quotes. Managing
	the Book (details, cover, sync, delete) lives behind the ⋯ menu, in dialogs.

	Forms submit with `enhance`, so the page does not reload and the open tab
	stays put. A failed submit reopens the place it came from (its tab or dialog).
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { formatDay, formatRating, RATING_STEPS } from '#lib/format';
	import MarkdownEditor from '#lib/components/MarkdownEditor.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import StatusIcon from '#lib/components/StatusIcon.svelte';
	import TagEditor from '#lib/components/TagEditor.svelte';
	import ImpressionFields from '#lib/components/ImpressionFields.svelte';
	import ImpressionView from '#lib/components/ImpressionView.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const book = $derived(data.book);
	const byline = $derived(book.authors.join(', ') || 'Unknown author');

	/** The status switches, in the order the Add page shows them. */
	const switches = [
		{ key: 'want', on: 'In Bookstack', off: 'Add to Bookstack' },
		{ key: 'reading', on: 'Reading', off: 'Mark as Reading' },
		{ key: 'finished', on: 'Read it', off: 'Mark as Read it' }
	] as const;
	/** Star values 5 → ½; drawn reversed so hover fills everything to the left. */
	const STARS_HIGH_TO_LOW = [...RATING_STEPS].reverse();

	type Tab = 'notes' | 'quotes' | 'impressions';
	type DialogName = 'details' | 'cover' | 'sync' | 'shelves' | 'delete';

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'impressions', label: 'Impressions' },
		{ id: 'notes', label: 'Notes' },
		{ id: 'quotes', label: 'Quotes' }
	];

	let tab = $state<Tab>('impressions');
	const activeTab = $derived(tab);

	/** Which Quote or Note is being edited in place, e.g. `quote-12`. */
	let editing = $state<string | null>(null);
	let addingQuote = $state(false);
	let addingNote = $state(false);
	let addingImpression = $state(false);
	let tabsEl: HTMLElement | undefined = $state();
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
		} else if (form?.impressionError) {
			tab = 'impressions';
			if (form.impressionId != null) editing = `impression-${form.impressionId}`;
		} else if (form?.metaError) {
			dialog = 'details';
		} else if (form?.syncError) {
			dialog = 'sync';
		} else if (form?.coverError) {
			dialog = 'cover';
		} else if (form?.shelfError) {
			dialog = 'shelves';
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

	/** The panel's buttons: open a tab's add form and bring it into view. */
	function openAdder(kind: Tab) {
		tab = kind;
		addingImpression = kind === 'impressions';
		addingNote = kind === 'notes';
		addingQuote = kind === 'quotes';
		requestAnimationFrame(() => tabsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
</script>

<svelte:head>
	<title>{book.title} · apostillas</title>
</svelte:head>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

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
							<button type="button" role="menuitem" onclick={() => openDialog('shelves')}
								>Add to Shelf…</button
							>
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
			<TagEditor tags={data.tags} allTags={data.allTags} error={form?.tagError ?? null} />
			<p class="facts">
				{#if book.pageCount}<span>{book.pageCount} pages</span>{/if}
				{#if book.isbn}<span>ISBN {book.isbn}</span>{/if}
				<span>Added {formatDay(book.createdAt)}</span>
			</p>
			{#if book.whyRecommended}
				<p class="why">“{book.whyRecommended}”</p>
			{/if}

		</div>

		<!-- Action panel: Reading Status switches (each toggles on/off), the
		     Book's Rating (a star also switches Read it on, ADR-0006), and the
		     buttons that open the add forms in the tabs below. -->
		<div class="panel-actions">
			<div class="statuses" role="group" aria-label="Reading status">
				{#each switches as sw (sw.key)}
					{@const isOn = book.statuses[sw.key] !== null}
					<form method="POST" action="?/setStatus" use:enhance={submit()}>
						<input type="hidden" name="status" value={sw.key} />
						<input type="hidden" name="on" value={isOn ? '0' : '1'} />
						<button
							type="submit"
							class="status"
							class:on={isOn}
							aria-pressed={isOn}
							title={isOn ? `${sw.on} (click to undo)` : sw.off}
							aria-label={sw.on}><StatusIcon status={sw.key} size={20} /></button
						>
					</form>
				{/each}
			</div>
			<form method="POST" action="?/rate" class="rate" use:enhance={submit()}>
				<span class="stars" role="group" aria-label="Rating">
					{#each STARS_HIGH_TO_LOW as n (n)}
						<button
							type="submit"
							name="rating"
							value={n}
							class={Number.isInteger(n) ? 'half-right' : 'half-left'}
							class:lit={book.rating != null && n <= book.rating}
							title={`Rate ${formatRating(n)} of 5`}
							aria-label={`Rate ${formatRating(n)} of 5`}
							aria-pressed={book.rating === n}><span aria-hidden="true">★</span></button
						>
					{/each}
				</span>
				{#if book.rating != null}
					<span class="visually-hidden">Rated {formatRating(book.rating)} of 5</span>
				{/if}
				<button
					type="submit"
					name="clear"
					value="1"
					class="ghost clear-rating"
					class:hidden={book.rating == null}
					title="Clear rating"
					aria-label="Clear rating">×</button
				>
			</form>
			<button type="button" class="primary" onclick={() => openAdder('impressions')}
				>Leave an Impression</button
			>
			<button type="button" onclick={() => openAdder('notes')}>Add a Note</button>
			<button type="button" onclick={() => openAdder('quotes')}>Add a Quote</button>
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

	<section class="tabbed" bind:this={tabsEl}>
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
				</button>
			{/each}
		</div>

		<!-- Notes -->
		{#if activeTab === 'notes'}
			<div class="tabpanel" role="tabpanel" id="panel-notes" aria-labelledby="tab-notes">
				{#if form?.noteError}
					<p class="error" role="alert">{form.noteError}</p>
				{/if}

				{#if addingNote}
					<form
						method="POST"
						action="?/addNote"
						class="stack panel wide"
						use:enhance={submit({ done: () => (addingNote = false) })}
					>
						<MarkdownEditor autofocus />
						<div class="form-actions">
							<button type="submit" class="primary small">Add Note</button>
							<button type="button" class="ghost small" onclick={() => (addingNote = false)}
								>Cancel</button
							>
						</div>
					</form>
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
										<MarkdownEditor value={n.body} />
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
										<div class="item-meta"></div>
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
						<div class="form-actions">
							<button type="submit" class="primary small">Add Quote</button>
							<button type="button" class="ghost small" onclick={() => (addingQuote = false)}
								>Cancel</button
							>
						</div>
					</form>
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


		<!-- Impressions -->
		{#if activeTab === 'impressions'}
			<div class="tabpanel" role="tabpanel" id="panel-impressions" aria-labelledby="tab-impressions">
				{#if form?.impressionError}
					<p class="error" role="alert">{form.impressionError}</p>
				{/if}

				{#if addingImpression}
					<form
						method="POST"
						action="?/addImpression"
						class="stack panel wide"
						use:enhance={submit({ done: () => (addingImpression = false) })}
					>
						<ImpressionFields today={data.today} />
						<div class="form-actions">
							<button type="submit" class="primary small">Leave Impression</button>
							<button type="button" class="ghost small" onclick={() => (addingImpression = false)}
								>Cancel</button
							>
						</div>
					</form>
				{/if}

				{#if data.impressions.length === 0}
					<p class="muted empty">No Impressions yet.</p>
				{:else}
					<ul class="items">
						{#each data.impressions as imp (imp.id)}
							{@const key = `impression-${imp.id}`}
							<li class="item">
								{#if editing === key}
									<form
										method="POST"
										action="?/editImpression"
										class="stack edit"
										use:enhance={submit({ done: () => (editing = null) })}
									>
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
									<div class="item-row">
										<ImpressionView impression={imp} />
										{@render itemTools(key, '?/deleteImpression', 'impressionId', imp.id, 'Delete this Impression?')}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>
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

<Dialog title="Add to Shelf" bind:open={() => dialog === 'shelves', (v) => setDialogOpen('shelves', v)}>
	<div class="stack">
		{#if data.shelves.length > 0}
			<ul class="shelf-picks">
				{#each data.shelves as s (s.id)}
					<li>
						<form
							method="POST"
							action="?/setShelf"
							use:enhance={() =>
								async ({ update }) => {
									await update({ reset: false });
								}}
						>
							<input type="hidden" name="shelfId" value={s.id} />
							<label class="check">
								<input
									type="checkbox"
									name="on"
									value="1"
									checked={s.on}
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								/>
								{s.name}
							</label>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="dialog-text">You have no Shelves yet. Make one below.</p>
		{/if}
		<form
			method="POST"
			action="?/newShelf"
			class="new-shelf"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: result.type === 'success' });
				}}
		>
			{#if form?.shelfError}<p class="error" role="alert">{form.shelfError}</p>{/if}
			<label class="field">
				<span>New Shelf</span>
				<span class="new-shelf-row">
					<input name="name" type="text" required maxlength="60" placeholder="Name" />
					<button type="submit" class="small">Create and add</button>
				</span>
			</label>
		</form>
		<p class="muted shelf-hint">Changes save as you tick. <a href="/bookcase">Go to the Bookcase</a></p>
	</div>
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
	.shelf-picks {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: min(18rem, 45vh);
		overflow-y: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.shelf-picks li + li {
		border-top: 1px solid var(--border);
	}
	.shelf-picks form {
		margin: 0;
	}
	.shelf-picks .check {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0.8rem;
		cursor: pointer;
	}
	.shelf-picks .check:hover {
		background: var(--surface);
	}
	.new-shelf {
		margin: 0;
	}
	.new-shelf-row {
		display: flex;
		gap: 0.4rem;
	}
	.new-shelf-row input {
		flex: 1;
		min-width: 0;
	}
	.new-shelf-row button {
		white-space: nowrap;
	}
	.shelf-hint {
		margin: 0;
		font-size: 0.85rem;
	}
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
		grid-template-columns: 10rem 1fr 13rem;
		gap: 1.75rem;
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
		justify-content: flex-end;
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
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem 1rem;
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: var(--text-faint);
	}
	.facts span {
		white-space: nowrap;
	}
	.why {
		margin: 0.25rem 0 0;
		font-style: italic;
		color: var(--text-muted);
	}
	/* The action panel: one rectangle of status switches, stars and buttons. */
	.panel-actions {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.panel-actions > button {
		width: 100%;
	}
	.statuses {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}
	.statuses form {
		margin: 0;
	}
	button.status {
		width: 100%;
		height: 2.4rem;
		padding: 0;
		display: grid;
		place-items: center;
	}
	button.status.on,
	button.status.on:hover {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-contrast);
	}
	.rate {
		position: relative;
		display: flex;
		justify-content: center;
		margin: 0.1rem 0;
	}
	.clear-rating {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		padding: 0 0.4rem;
		line-height: 1.4;
		color: var(--text-faint);
	}
	.clear-rating.hidden {
		visibility: hidden;
	}

	/* Stars: each button is one half of a 1em-wide glyph, drawn 5 → ½ and
	   reversed, so hovering lights everything to the left of the pointer. */
	.stars {
		display: inline-flex;
		flex-direction: row-reverse;
	}
	.stars button {
		display: inline-block;
		background: none;
		border: none;
		border-radius: 0;
		padding: 0;
		width: 0.5em;
		overflow: hidden;
		font-size: 1.6rem;
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
	.stars button.lit {
		color: var(--star);
	}
	/* While hovering, show the would-be rating instead of the current one. */
	.stars:hover button {
		color: var(--star-empty);
	}
	.stars button:hover,
	.stars button:hover ~ button,
	.stars button:focus-visible,
	.stars button:focus-visible ~ button {
		background: none;
		color: var(--star);
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
		.panel-actions {
			grid-column: 1 / -1;
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
	.tools form {
		margin: 0;
		display: inline;
	}
	.edit {
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
	}
	.form-actions {
		display: flex;
		gap: 0.4rem;
		align-items: center;
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
