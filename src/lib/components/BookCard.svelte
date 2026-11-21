<!--
	One Book on a shelf: just its cover, linking to the Book page. The title and
	author show as a hover tooltip and are in the link for screen readers. The
	optional `detail` snippet renders list-specific extras under the cover (the
	Books list's rating and Reread marker). Books without a cover get a
	placeholder that shows the title and author, so the shelf still reads.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import BookCover from './BookCover.svelte';

	let {
		bookId,
		title,
		authors,
		coverPath,
		detail
	}: {
		bookId: number;
		title: string;
		authors: string[];
		coverPath: string | null;
		detail?: Snippet;
	} = $props();

	const byline = $derived(authors.join(', ') || 'Unknown author');
</script>

<li class="card">
	<a class="link" href={`/books/${bookId}`} title={`${title} — ${byline}`}>
		<span class="visually-hidden">{title}, {byline}</span>
		<BookCover {title} {authors} {coverPath} />
	</a>
	{#if detail}
		<div class="detail">{@render detail()}</div>
	{/if}
</li>

<style>
	.card {
		list-style: none;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.link {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		color: inherit;
		text-decoration: none;
	}
	.link:hover :global(.cover) {
		transform: translateY(-2px);
		box-shadow:
			0 0 0 1px var(--border-strong),
			0 8px 20px rgb(0 0 0 / 0.14);
	}
	.detail {
		margin-top: 0.45rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
</style>
