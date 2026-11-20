<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { formatDay, ratingStars } from '#lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Finished · apostillas</title>
</svelte:head>

<h1>Finished</h1>

{#if data.finished.length === 0}
	<EmptyState message="You haven't finished anything yet." />
{:else}
	<ul class="list">
		{#each data.finished as item (item.bookId)}
			<BookCard
				bookId={item.bookId}
				title={item.title}
				authors={item.authors}
				coverPath={item.coverPath}
			>
				{#snippet detail()}
					<span class="finished">
						Finished {formatDay(item.finishDate)}
						{#if item.isReread}
							<span class="reread" title="Reread">↻ Reread</span>
						{/if}
					</span>
					{#if item.rating != null}
						<span class="rating" title={`${item.rating} out of 5`}>{ratingStars(item.rating)}</span>
					{/if}
				{/snippet}
			</BookCard>
		{/each}
	</ul>
{/if}

<style>
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.finished {
		color: #666;
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
	}
	.reread {
		color: #1a56db;
		font-weight: 600;
	}
	.rating {
		display: block;
		color: #b8860b;
		letter-spacing: 1px;
	}
</style>
