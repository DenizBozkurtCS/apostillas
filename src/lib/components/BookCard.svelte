<!--
	One Book on a shelf: just its cover, linking to the Book page. The title and
	author show as a hover tooltip and are in the link for screen readers. The
	optional `detail` snippet renders list-specific extras under the cover (the
	Books list's rating and Reread marker). Books without a cover get a
	placeholder that shows the title and author, so the shelf still reads.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

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
		{#if coverPath}
			<img class="cover" src={`/${coverPath}`} alt="" width="200" height="300" loading="lazy" />
		{:else}
			<div class="cover cover--none" aria-hidden="true">
				<span class="placeholder-title">{title}</span>
				<span class="placeholder-author">{byline}</span>
			</div>
		{/if}
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
			0 2px 6px rgb(0 0 0 / 0.08);
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}
	.link:hover .cover {
		transform: translateY(-2px);
		box-shadow:
			0 0 0 1px var(--border-strong),
			0 8px 20px rgb(0 0 0 / 0.14);
	}
	.cover--none {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.9rem;
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
		overflow: hidden;
	}
	.placeholder-title {
		font-weight: 650;
		font-size: 0.95rem;
		line-height: 1.25;
		display: -webkit-box;
		-webkit-line-clamp: 5;
		line-clamp: 5;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.placeholder-author {
		font-size: 0.8rem;
		color: var(--text-muted);
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
