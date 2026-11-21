<!--
	The Bookcase (apostillas-v3/01): every Shelf as a row, in the reader's order
	(new Shelves at the top). A row shows one line of the covers that fit, never
	scrolling sideways, and links to the Shelf's page. Each row's ⋯ menu renames,
	moves or deletes the Shelf.
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Dialog from '#lib/components/Dialog.svelte';
	import ShelfTile from '#lib/components/ShelfTile.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Shelf = PageData['shelves'][number];

	let creating = $state(false);
	let renaming = $state<Shelf | null>(null);
	let menuFor = $state<number | null>(null);

	// Reopen a dialog whose form was refused, so its message shows.
	$effect(() => {
		if (form?.createError) creating = true;
		if (form?.renameError && 'renameId' in form) {
			renaming = data.shelves.find((s) => s.id === form.renameId) ?? null;
		}
	});

	/** Close menus on an outside click or Escape. */
	function onWindowClick(event: MouseEvent) {
		if (menuFor !== null && !(event.target as Element).closest?.('.more')) menuFor = null;
	}
	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') menuFor = null;
	}

	function submit(opts: { confirm?: string; done?: () => void } = {}): SubmitFunction {
		return ({ cancel }) => {
			menuFor = null;
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

	function deleteMessage(s: Shelf): string {
		const n = s.books.length;
		const books = n === 0 ? '' : ` Its ${n} ${n === 1 ? 'book stays' : 'books stay'} in your library.`;
		return `Delete the Shelf “${s.name}”?${books}`;
	}

	// ---------- One line of covers per row ----------
	/** Width of the rows, measured; every row is the same width. */
	let rowWidth = $state(0);
	/** How many tiles fit on one line, matching the Library grid's tile sizes. */
	const perRow = $derived.by(() => {
		if (rowWidth === 0) return 6;
		const phone = rowWidth < 30 * 16;
		const tile = (phone ? 6.5 : 8.5) * 16;
		const gap = (phone ? 0.9 : 1.25) * 16;
		return Math.max(1, Math.floor((rowWidth + gap) / (tile + gap)));
	});
</script>

<svelte:head>
	<title>Bookcase · apostillas</title>
</svelte:head>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="page-head head">
	<h1>Bookcase</h1>
	{#if data.shelves.length > 0}
		<button type="button" class="primary small" onclick={() => (creating = true)}>+ New Shelf</button>
	{/if}
</div>

{#if data.shelves.length === 0}
	<div class="empty">
		<p>Your Bookcase has no Shelves yet. Make one to group Books your own way.</p>
		<button type="button" class="primary" onclick={() => (creating = true)}>+ New Shelf</button>
	</div>
{:else}
	<div class="shelves" bind:clientWidth={rowWidth}>
		{#each data.shelves as shelf, i (shelf.id)}
			{@const href = `/bookcase/${shelf.slug}`}
			{@const overflow = shelf.books.length > perRow}
			<section class="shelf" aria-labelledby={`shelf-${shelf.id}`}>
				<div class="shelf-head">
					<h2 id={`shelf-${shelf.id}`}>
						<a {href}>{shelf.name}</a>
						<span class="count">{shelf.books.length}</span>
					</h2>
					<div class="end">
						{#if shelf.books.length > 0}
							<a class="see-all" {href}
								>{overflow ? `See all (${shelf.books.length})` : 'Open'} →</a
							>
						{/if}
						<div class="more">
							<button
								type="button"
								class="ghost more-button"
								aria-label={`More actions for ${shelf.name}`}
								aria-haspopup="menu"
								aria-expanded={menuFor === shelf.id}
								onclick={() => (menuFor = menuFor === shelf.id ? null : shelf.id)}
								><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
									><circle cx="5" cy="12" r="1.8" fill="currentColor" /><circle
										cx="12"
										cy="12"
										r="1.8"
										fill="currentColor"
									/><circle cx="19" cy="12" r="1.8" fill="currentColor" /></svg
								></button
							>
							{#if menuFor === shelf.id}
								<div class="menu" role="menu">
									<button
										type="button"
										role="menuitem"
										onclick={() => {
											menuFor = null;
											renaming = shelf;
										}}>Rename</button
									>
									<form method="POST" action="?/move" use:enhance={submit()}>
										<input type="hidden" name="shelfId" value={shelf.id} />
										<button type="submit" role="menuitem" name="direction" value="up" disabled={i === 0}
											>Move up</button
										>
										<button
											type="submit"
											role="menuitem"
											name="direction"
											value="down"
											disabled={i === data.shelves.length - 1}>Move down</button
										>
									</form>
									<hr />
									<form method="POST" action="?/delete" use:enhance={submit({ confirm: deleteMessage(shelf) })}>
										<input type="hidden" name="shelfId" value={shelf.id} />
										<button type="submit" role="menuitem" class="danger-item">Delete Shelf</button>
									</form>
								</div>
							{/if}
						</div>
					</div>
				</div>

				{#if shelf.books.length === 0}
					<p class="no-books">No books yet. <a {href}>Open the Shelf</a></p>
				{:else}
					<ul class="row" style:--cols={perRow}>
						{#each shelf.books.slice(0, perRow) as book (book.bookId)}
							<ShelfTile {book} />
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</div>
{/if}

<Dialog bind:open={creating} title="New Shelf">
	<form
		method="POST"
		action="?/create"
		class="stack"
		use:enhance={submit({ done: () => (creating = false) })}
	>
		{#if form?.createError}<p class="error" role="alert">{form.createError}</p>{/if}
		<label class="field">
			<span>Name</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input name="name" type="text" required maxlength="60" autofocus value={form?.name ?? ''} />
		</label>
		<label class="field">
			<span>Description (optional)</span>
			<textarea name="description" rows="2" maxlength="500"></textarea>
		</label>
		<button type="submit" class="primary">Create Shelf</button>
	</form>
</Dialog>

<Dialog
	bind:open={() => renaming !== null, (v) => {
		if (!v) renaming = null;
	}}
	title="Rename Shelf"
>
	{#if renaming}
		<form
			method="POST"
			action="?/rename"
			class="stack"
			use:enhance={submit({ done: () => (renaming = null) })}
		>
			{#if form?.renameError}<p class="error" role="alert">{form.renameError}</p>{/if}
			<input type="hidden" name="shelfId" value={renaming.id} />
			<label class="field">
				<span>Name</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input name="name" type="text" required maxlength="60" autofocus value={renaming.name} />
			</label>
			<button type="submit" class="primary">Save</button>
		</form>
	{/if}
</Dialog>

<style>
	.head {
		justify-content: space-between;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3.5rem 1.5rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-lg);
		text-align: center;
	}
	.empty p {
		margin: 0;
		color: var(--text-muted);
	}

	.shelves {
		display: flex;
		flex-direction: column;
		gap: 2.75rem;
	}
	.shelf-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.6rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}
	.shelf-head h2 {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
		margin: 0;
		font-size: 1.2rem;
	}
	.shelf-head h2 a {
		color: var(--text);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.shelf-head h2 a:hover {
		color: var(--accent);
	}
	.end {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}
	.see-all {
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--accent);
		text-decoration: none;
		white-space: nowrap;
	}
	.see-all:hover {
		text-decoration: underline;
	}
	.no-books {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.92rem;
	}
	.row {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: 1.25rem;
	}
	@media (max-width: 30rem) {
		.row {
			gap: 0.9rem;
		}
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
		min-width: 11rem;
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
	.menu button:hover:not(:disabled) {
		background: var(--surface);
	}
	.menu button:disabled {
		color: var(--text-faint);
		cursor: default;
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
