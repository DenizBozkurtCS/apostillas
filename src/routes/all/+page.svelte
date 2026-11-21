<!--
	All books: every Book in the library, whatever its Reading Statuses, with a
	box to add one by pasting its Goodreads link. Unlisted: nothing links here.
	A plain catalogue: just covers, with nothing of the reader's own (no
	statuses, Ratings or Tags).
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import BookCard from '#lib/components/BookCard.svelte';
	import LibraryList from '#lib/components/LibraryList.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let adding = $state(false);
</script>

<svelte:head>
	<title>All books · apostillas</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<LibraryList
	title="All books"
	items={data.books}
	empty="No books in the library yet. Paste a Goodreads link above to add one."
	sorts={[
		{ key: 'recent', label: 'Recently added' },
		{ key: 'recent:reversed', label: 'Oldest added' },
		{ key: 'title', label: 'Title A–Z' },
		{ key: 'title:reversed', label: 'Title Z–A' },
		{ key: 'author', label: 'Author A–Z' },
		{ key: 'author:reversed', label: 'Author Z–A' }
	]}
>
	{#snippet aside()}
		<form
			method="POST"
			action="?/goodreads"
			class="goodreads"
			use:enhance={() => {
				adding = true;
				return async ({ result, update }) => {
					await update({ reset: result.type === 'success' });
					adding = false;
				};
			}}
		>
			<label class="visually-hidden" for="goodreads-link">Goodreads link</label>
			<input
				id="goodreads-link"
				name="link"
				type="url"
				inputmode="url"
				placeholder="Paste a Goodreads link…"
				value={form && 'link' in form ? form.link : ''}
				required
				disabled={adding}
			/>
			<button type="submit" class="primary" disabled={adding}>{adding ? 'Adding…' : 'Add'}</button>
		</form>
		{#if form && 'error' in form && form.error}
			<p class="error notice" role="alert">{form.error}</p>
		{:else if form && 'added' in form && form.added}
			<p class="notice" role="status">
				{form.added.created ? 'Added' : 'Already in your library:'}
				<a href={`/books/${form.added.bookId}`}>{form.added.title}</a>
				{#if form.added.via && form.added.created}
					<span class="muted">
						(Goodreads didn’t send its page, so this was found by title on {form.added.via ===
						'google-books'
							? 'Google Books'
							: 'Open Library'}; check it’s the right book.)</span
					>
				{/if}
			</p>
		{/if}
	{/snippet}

	{#snippet card(item)}
		<BookCard bookId={item.bookId} title={item.title} authors={item.authors} coverPath={item.coverPath} />
	{/snippet}
</LibraryList>

<style>
	.goodreads {
		display: flex;
		gap: 0.5rem;
		width: 26rem;
		max-width: 100%;
	}
	.goodreads input {
		flex: 1;
		min-width: 0;
	}
	.notice {
		width: 26rem;
		max-width: 100%;
		margin: 0.4rem 0 0;
		font-size: 0.85rem;
	}
	.notice a {
		font-weight: 650;
	}
</style>
