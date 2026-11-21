<!--
	A small Book cover at a given width (2:3), or a soft placeholder when it has
	none. For lists and pickers where the title is shown beside it (BookCover is
	the full-size one with the title on its placeholder). Decorative.
-->
<script lang="ts">
	let { coverPath, width = '3rem' }: { coverPath: string | null; width?: string } = $props();
</script>

{#if coverPath}
	<img class="thumb" style:width src={`/${coverPath}`} alt="" loading="lazy" draggable="false" />
{:else}
	<span class="thumb none" style:width aria-hidden="true"></span>
{/if}

<style>
	.thumb {
		display: block;
		flex-shrink: 0;
		aspect-ratio: 2 / 3;
		height: auto;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--border);
	}
	.none {
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
	}
</style>
