<!--
	One entry in a Reading Status list: cover, title, and author, linking to the
	Book page. The optional `detail` snippet renders list-specific extras (date
	added and why, finish date and rating, date abandoned).
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
	<a class="link" href={`/books/${bookId}`}>
		{#if coverPath}
			<img class="cover" src={`/${coverPath}`} alt="" width="60" height="90" />
		{:else}
			<div class="cover cover--none" aria-hidden="true"></div>
		{/if}
		<div class="meta">
			<strong class="title">{title}</strong>
			<span class="byline">{byline}</span>
			{#if detail}
				<div class="detail">{@render detail()}</div>
			{/if}
		</div>
	</a>
</li>

<style>
	.card {
		list-style: none;
	}
	.link {
		display: grid;
		grid-template-columns: 60px 1fr;
		gap: 1rem;
		align-items: start;
		padding: 0.5rem;
		border-radius: 6px;
		color: inherit;
		text-decoration: none;
	}
	.link:hover {
		background: #f3f3f3;
	}
	.cover {
		width: 60px;
		height: 90px;
		object-fit: cover;
		background: #eee;
		border-radius: 2px;
	}
	.cover--none {
		border: 1px dashed #bbb;
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.title {
		font-size: 1rem;
	}
	.byline {
		color: #555;
	}
	.detail {
		margin-top: 0.3rem;
		font-size: 0.85rem;
		color: #444;
	}
</style>
