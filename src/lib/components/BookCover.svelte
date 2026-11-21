<!--
	A Book's cover at 2:3, or, without one, a placeholder showing the title and
	author. Decorative: whatever wraps it names the Book for screen readers.
-->
<script lang="ts">
	let { title, authors, coverPath }: { title: string; authors: string[]; coverPath: string | null } =
		$props();

	const byline = $derived(authors.join(', ') || 'Unknown author');
</script>

{#if coverPath}
	<img class="cover" src={`/${coverPath}`} alt="" width="200" height="300" loading="lazy" draggable="false" />
{:else}
	<div class="cover cover--none" aria-hidden="true">
		<span class="placeholder-title">{title}</span>
		<span class="placeholder-author">{byline}</span>
	</div>
{/if}

<style>
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
</style>
