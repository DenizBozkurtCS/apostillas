<!--
	Shelves (once the Bookcase, apostillas-v3/01): every Shelf as a compact row,
	in the reader's order (new Shelves at the top). A row shows a small fanned
	stack of the Shelf's first covers, its name, how many books it holds and its
	description, and opens the Shelf's page. Each row's ⋯ menu renames, moves or
	deletes the Shelf.
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Dialog from '#lib/components/Dialog.svelte';
	import CoverThumb from '#lib/components/CoverThumb.svelte';
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

	/** How many covers a row's stack shows. */
	const STACK = 5;

	const count = (n: number) => `${n} ${n === 1 ? 'book' : 'books'}`;
</script>

<svelte:head>
	<title>Shelves · apostillas</title>
</svelte:head>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="page-head head">
	<h1 class="page-title">Shelves</h1>
	{#if data.shelves.length > 0}
		<button type="button" class="primary small" onclick={() => (creating = true)}>+ New Shelf</button>
	{/if}
</div>

{#if data.shelves.length === 0}
	<div class="empty">
		<p>No Shelves yet. Make one to group Books your own way.</p>
		<button type="button" class="primary" onclick={() => (creating = true)}>+ New Shelf</button>
	</div>
{:else}
	<ul class="shelves">
		{#each data.shelves as shelf, i (shelf.id)}
			{@const href = `/shelves/${shelf.slug}`}
			<li class="shelf" class:menu-open={menuFor === shelf.id}>
				<a class="shelf-link" {href}>
					<span class="stack" aria-hidden="true">
						{#if shelf.books.length === 0}
							<span class="stack-empty"></span>
						{:else}
							{#each shelf.books.slice(0, STACK) as book, j (book.bookId)}
								<span class="stack-cover" style:z-index={STACK - j}
									><CoverThumb coverPath={book.coverPath} width="100%" /></span
								>
							{/each}
						{/if}
					</span>
					<span class="shelf-text">
						<span class="name">{shelf.name}</span>
						<span class="count">{shelf.books.length === 0 ? 'Empty' : count(shelf.books.length)}</span>
						{#if shelf.description}<span class="description">{shelf.description}</span>{/if}
					</span>
				</a>
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
			</li>
		{/each}
	</ul>
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
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--border);
	}
	.shelf {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-bottom: 1px solid var(--border);
	}
	.shelf.menu-open {
		z-index: 2;
	}
	.shelf-link {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1.1rem 0.75rem;
		margin: 0 -0.75rem;
		border-radius: var(--radius);
		color: inherit;
		text-decoration: none;
		transition: background 0.12s;
	}
	.shelf-link:hover {
		background: var(--surface);
	}

	/* A fanned stack of up to five covers, the first on top. */
	.stack {
		--w: 3.75rem;
		--step: 2.1rem;
		position: relative;
		flex-shrink: 0;
		width: calc(var(--w) + 4 * var(--step));
		height: calc(var(--w) * 1.5);
	}
	.stack-cover {
		position: absolute;
		top: 0;
		width: var(--w);
		transition: transform 0.18s ease;
	}
	.stack-cover:nth-child(1) {
		left: 0;
	}
	.stack-cover:nth-child(2) {
		left: var(--step);
	}
	.stack-cover:nth-child(3) {
		left: calc(2 * var(--step));
	}
	.stack-cover:nth-child(4) {
		left: calc(3 * var(--step));
	}
	.stack-cover:nth-child(5) {
		left: calc(4 * var(--step));
	}
	.stack-cover :global(.thumb) {
		box-shadow:
			0 0 0 1px var(--border),
			2px 0 8px rgb(0 0 0 / 0.18);
	}
	.shelf-link:hover .stack-cover:nth-child(2) {
		transform: translateX(0.2rem);
	}
	.shelf-link:hover .stack-cover:nth-child(3) {
		transform: translateX(0.4rem);
	}
	.shelf-link:hover .stack-cover:nth-child(4) {
		transform: translateX(0.6rem);
	}
	.shelf-link:hover .stack-cover:nth-child(5) {
		transform: translateX(0.8rem);
	}
	.stack-empty {
		position: absolute;
		inset: 0 auto 0 0;
		width: var(--w);
		border: 1.5px dashed var(--border-strong);
		border-radius: var(--radius-sm);
	}

	.shelf-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.name {
		font-size: 1.15rem;
		font-weight: 650;
		overflow-wrap: anywhere;
	}
	.shelf-link:hover .name {
		color: var(--accent);
	}
	.count {
		font-size: 0.85rem;
		color: var(--text-faint);
	}
	.description {
		margin-top: 0.2rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	@media (max-width: 30rem) {
		.stack {
			--w: 2.9rem;
			--step: 1.2rem;
		}
		.shelf-link {
			gap: 1rem;
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
