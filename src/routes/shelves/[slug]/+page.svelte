<!--
	A Shelf's page (apostillas-v3/02): its name, description and Books in the
	reader's order.

	- "+ Add books" searches the library (in the browser; it is small) and adds
	  a Book to the end, or takes one already on the Shelf off it.
	- "Arrange" lets the reader drag covers into order, or use the ‹ › buttons
	  (phones, keyboard), and take Books off with ×. Nothing is saved until
	  Done; Cancel puts everything back.
	- The ⋯ menu renames the Shelf (its address follows), edits the
	  description, or deletes the Shelf (its Books stay in the library).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { enhance, type SubmitFunction } from '$app/forms';
	import BookCover from '#lib/components/BookCover.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import ShelfTile from '#lib/components/ShelfTile.svelte';
	import { NO_FILTER, filterItems } from '#lib/domain/listView';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const shelf = $derived(data.shelf);

	type Book = PageData['shelf']['books'][number];
	type DialogName = 'add' | 'rename' | 'describe';

	let dialog = $state<DialogName | null>(null);
	let menuOpen = $state(false);

	// Reopen the rename dialog if the new name was refused.
	$effect(() => {
		if (form?.renameError) dialog = 'rename';
	});

	function onWindowClick(event: MouseEvent) {
		if (menuOpen && !(event.target as Element).closest?.('.more')) menuOpen = false;
	}
	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') menuOpen = false;
	}

	function openDialog(name: DialogName) {
		menuOpen = false;
		dialog = name;
	}

	function submit(opts: { confirm?: string; reset?: boolean; done?: () => void } = {}): SubmitFunction {
		return ({ cancel }) => {
			menuOpen = false;
			if (opts.confirm && !confirm(opts.confirm)) {
				cancel();
				return;
			}
			return async ({ result, update }) => {
				await update({ reset: (opts.reset ?? true) && result.type === 'success' });
				if (result.type === 'success' || result.type === 'redirect') opts.done?.();
			};
		};
	}

	const deleteMessage = $derived.by(() => {
		const n = shelf.books.length;
		const books = n === 0 ? '' : ` Its ${n} ${n === 1 ? 'book stays' : 'books stay'} in your library.`;
		return `Delete the Shelf “${shelf.name}”?${books}`;
	});

	// ---------- + Add books ----------
	let query = $state('');
	const onShelf = $derived(new Set(shelf.books.map((b) => b.bookId)));
	const results = $derived(
		filterItems(data.library, { ...NO_FILTER, tags: [], text: query }).slice(0, 50)
	);

	// ---------- Arrange ----------
	let arranging = $state(false);
	/** The working order while arranging. */
	let order = $state<Book[]>([]);
	let removed = $state<number[]>([]);
	let dragId = $state<number | null>(null);
	let announcement = $state('');

	function startArranging() {
		order = [...shelf.books];
		removed = [];
		announcement = '';
		arranging = true;
	}

	function cancelArranging() {
		arranging = false;
		dragId = null;
	}

	/** Move a Book to `to` (an index in the working order). */
	function moveTo(id: number, to: number) {
		const from = order.findIndex((b) => b.bookId === id);
		if (from < 0 || to < 0 || to >= order.length || from === to) return;
		const next = [...order];
		const [book] = next.splice(from, 1);
		next.splice(to, 0, book);
		order = next;
		announcement = `${book.title} moved to position ${to + 1} of ${order.length}.`;
	}

	async function step(id: number, delta: -1 | 1) {
		const from = order.findIndex((b) => b.bookId === id);
		moveTo(id, from + delta);
		await tick();
		// Keep focus on the moved Book's button (or its other one at an end).
		const same = document.getElementById(`move-${delta < 0 ? 'earlier' : 'later'}-${id}`) as HTMLButtonElement | null;
		const other = document.getElementById(`move-${delta < 0 ? 'later' : 'earlier'}-${id}`) as HTMLButtonElement | null;
		(same && !same.disabled ? same : other)?.focus();
	}

	function takeOff(book: Book) {
		order = order.filter((b) => b.bookId !== book.bookId);
		removed = [...removed, book.bookId];
		announcement = `${book.title} will be taken off the Shelf.`;
	}

	function onDragOver(event: DragEvent, overId: number) {
		event.preventDefault();
		if (dragId === null || dragId === overId) return;
		moveTo(dragId, order.findIndex((b) => b.bookId === overId));
	}

	const byline = (b: Book) => b.authors.join(', ') || 'Unknown author';
</script>

<svelte:head>
	<title>{shelf.name} · apostillas</title>
</svelte:head>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<a class="back" href="/shelves">← Shelves</a>

<div class="head">
	<div class="page-head title">
		<h1>{shelf.name}</h1>
		{#if shelf.books.length > 0}<span class="count">{shelf.books.length}</span>{/if}
	</div>
	{#if !arranging}
		<div class="actions">
			<button type="button" class="primary small" onclick={() => openDialog('add')}>+ Add books</button>
			{#if shelf.books.length > 0}
				<button type="button" class="small" onclick={startArranging}>Arrange</button>
			{/if}
			<div class="more">
				<button
					type="button"
					class="ghost more-button"
					aria-label="More actions for this Shelf"
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
						<button type="button" role="menuitem" onclick={() => openDialog('rename')}>Rename</button>
						<button type="button" role="menuitem" onclick={() => openDialog('describe')}
							>{shelf.description ? 'Edit description' : 'Add a description'}</button
						>
						<hr />
						<form method="POST" action="?/delete" use:enhance={submit({ confirm: deleteMessage })}>
							<button type="submit" role="menuitem" class="danger-item">Delete Shelf</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if shelf.description}
	<p class="description">{shelf.description}</p>
{/if}

{#if arranging}
	<div class="arrange-bar">
		<p>Drag covers into order, or use ‹ ›. × takes a book off this Shelf.</p>
		<form
			method="POST"
			action="?/arrange"
			use:enhance={submit({ done: () => (arranging = false) })}
		>
			<input type="hidden" name="order" value={order.map((b) => b.bookId).join(',')} />
			<input type="hidden" name="removed" value={removed.join(',')} />
			<button type="button" class="ghost small" onclick={cancelArranging}>Cancel</button>
			<button type="submit" class="primary small">Done</button>
		</form>
	</div>
	<p class="visually-hidden" aria-live="polite">{announcement}</p>

	{#if order.length === 0}
		<p class="muted empty">All books will be taken off this Shelf. Press Done to save.</p>
	{:else}
		<ul class="grid arranging">
			{#each order as book, i (book.bookId)}
				<li
					class="slot"
					class:dragging={dragId === book.bookId}
					draggable="true"
					animate:flip={{ duration: 160 }}
					ondragstart={(e) => {
						dragId = book.bookId;
						e.dataTransfer?.setData('text/plain', String(book.bookId));
						if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
					}}
					ondragover={(e) => onDragOver(e, book.bookId)}
					ondrop={(e) => e.preventDefault()}
					ondragend={() => (dragId = null)}
					title={`${book.title} — ${byline(book)}`}
				>
					<BookCover title={book.title} authors={book.authors} coverPath={book.coverPath} />
					<div class="slot-tools">
						<button
							type="button"
							id={`move-earlier-${book.bookId}`}
							class="ghost small"
							aria-label={`Move ${book.title} earlier`}
							disabled={i === 0}
							onclick={() => step(book.bookId, -1)}>‹</button
						>
						<button
							type="button"
							class="ghost small remove"
							aria-label={`Take ${book.title} off this Shelf`}
							onclick={() => takeOff(book)}>×</button
						>
						<button
							type="button"
							id={`move-later-${book.bookId}`}
							class="ghost small"
							aria-label={`Move ${book.title} later`}
							disabled={i === order.length - 1}
							onclick={() => step(book.bookId, 1)}>›</button
						>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
{:else if shelf.books.length === 0}
	<div class="empty-shelf">
		<p>No books yet.</p>
		<button type="button" class="primary" onclick={() => openDialog('add')}>+ Add books</button>
	</div>
{:else}
	<ul class="grid">
		{#each shelf.books as book (book.bookId)}
			<ShelfTile {book} />
		{/each}
	</ul>
{/if}

<!-- + Add books -->
<Dialog
	bind:open={() => dialog === 'add', (v) => {
		dialog = v ? 'add' : null;
		if (!v) query = '';
	}}
	title={`Add books to ${shelf.name}`}
>
	<div class="add">
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="search"
			bind:value={query}
			placeholder="Search your library by title or author"
			aria-label="Search your library by title or author"
			autofocus
		/>
		{#if data.library.length === 0}
			<p class="muted">Your library is empty. <a href="/add">Add a book</a> first.</p>
		{:else if results.length === 0}
			<p class="muted">No books in your library match “{query.trim()}”.</p>
		{:else}
			<ul class="results">
				{#each results as b (b.bookId)}
					{@const on = onShelf.has(b.bookId)}
					<li>
						<span class="thumb"><BookCover title={b.title} authors={b.authors} coverPath={b.coverPath} /></span>
						<span class="who">
							<span class="r-title">{b.title}</span>
							<span class="r-author">{b.authors.join(', ') || 'Unknown author'}</span>
						</span>
						<form method="POST" action={on ? '?/remove' : '?/add'} use:enhance={submit({ reset: false })}>
							<input type="hidden" name="bookId" value={b.bookId} />
							{#if on}
								<button
									type="submit"
									class="small on"
									title="Take it off this Shelf"
									aria-label={`Take ${b.title} off this Shelf`}
									>✓ On Shelf</button
								>
							{:else}
								<button type="submit" class="small primary" aria-label={`Add ${b.title}`}>Add</button>
							{/if}
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Dialog>

<Dialog
	bind:open={() => dialog === 'rename', (v) => (dialog = v ? 'rename' : null)}
	title="Rename Shelf"
>
	<form method="POST" action="?/rename" class="stack" use:enhance={submit({ done: () => (dialog = null) })}>
		{#if form?.renameError}<p class="error" role="alert">{form.renameError}</p>{/if}
		<label class="field">
			<span>Name</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input name="name" type="text" required maxlength="60" autofocus value={shelf.name} />
		</label>
		<button type="submit" class="primary">Save</button>
	</form>
</Dialog>

<Dialog
	bind:open={() => dialog === 'describe', (v) => (dialog = v ? 'describe' : null)}
	title="Description"
>
	<form method="POST" action="?/describe" class="stack" use:enhance={submit({ done: () => (dialog = null) })}>
		<label class="field">
			<span>Shown on this page only (optional)</span>
			<!-- svelte-ignore a11y_autofocus -->
			<textarea name="description" rows="3" maxlength="500" autofocus>{shelf.description ?? ''}</textarea>
		</label>
		<button type="submit" class="primary">Save</button>
	</form>
</Dialog>

<style>
	.back {
		display: inline-block;
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		text-decoration: none;
	}
	.back:hover {
		color: var(--accent);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}
	.head .title {
		margin: 0;
		min-width: 0;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.description {
		max-width: var(--content-narrow);
		margin: -0.5rem 0 1.75rem;
		color: var(--text-muted);
		white-space: pre-line;
	}

	.grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1.75rem 1.25rem;
	}
	@media (max-width: 30rem) {
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
			gap: 1.25rem 0.9rem;
		}
	}
	.empty-shelf {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3.5rem 1.5rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-lg);
	}
	.empty-shelf p {
		margin: 0;
		color: var(--text-muted);
	}

	/* ---------- Arrange ---------- */
	.arrange-bar {
		position: sticky;
		top: 4rem;
		z-index: 3;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 1.5rem;
		padding: 0.6rem 0.75rem 0.6rem 1rem;
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		background: var(--accent-soft);
	}
	.arrange-bar p {
		margin: 0;
		font-size: 0.9rem;
	}
	.arrange-bar form {
		display: flex;
		gap: 0.4rem;
		margin: 0 0 0 auto;
	}
	.slot {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		cursor: grab;
		touch-action: manipulation;
	}
	.slot.dragging {
		opacity: 0.4;
	}
	.slot :global(.cover) {
		outline: 2px dashed transparent;
		outline-offset: 3px;
	}
	.slot:hover :global(.cover) {
		outline-color: var(--accent);
	}
	.slot-tools {
		display: flex;
		justify-content: space-between;
	}
	.slot-tools button {
		min-width: 2rem;
		font-size: 1.1rem;
		line-height: 1;
	}
	.slot-tools .remove {
		color: var(--danger);
	}

	/* ---------- + Add books ---------- */
	.add {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: min(26rem, 55vh);
		overflow-y: auto;
	}
	.results li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}
	.results li:last-child {
		border-bottom: none;
	}
	.thumb {
		width: 2.25rem;
		flex-shrink: 0;
	}
	.thumb :global(.cover--none) {
		padding: 0.2rem;
	}
	.thumb :global(.placeholder-title),
	.thumb :global(.placeholder-author) {
		display: none;
	}
	.who {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.r-title {
		font-weight: 600;
		font-size: 0.92rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.r-author {
		font-size: 0.82rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.results form {
		margin: 0;
	}
	.on {
		color: var(--accent);
		border-color: var(--accent);
		background: var(--accent-soft);
		white-space: nowrap;
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
		min-width: 12rem;
		padding: 0.3rem;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-raised);
		box-shadow: var(--shadow);
	}
	.menu form {
		display: flex;
		flex-direction: column;
		margin: 0;
	}
	.menu button {
		justify-content: flex-start;
		width: 100%;
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
	}
	.menu hr {
		margin: 0.25rem 0.3rem;
		border: none;
		border-top: 1px solid var(--border);
	}
</style>
