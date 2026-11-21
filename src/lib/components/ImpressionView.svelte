<!--
	One Impression as read-only text: its date, stars, the ↻ Reread and
	⊘ Didn't finish markers, and the short review (line breaks kept).
-->
<script lang="ts">
	import type { Impression } from '#lib/domain/impressions';
	import { formatDay } from '#lib/format';
	import Stars from './Stars.svelte';

	let { impression }: { impression: Omit<Impression, 'id'> } = $props();
</script>

<div class="impression">
	<div class="line">
		<time datetime={impression.date}>{formatDay(impression.date)}</time>
		{#if impression.rating != null}<Stars rating={impression.rating} />{/if}
		{#if impression.reread}
			<span class="marker"><span aria-hidden="true">↻</span> Reread</span>
		{/if}
		{#if impression.didNotFinish}
			<span class="marker dnf"><span aria-hidden="true">⊘</span> Didn't finish</span>
		{/if}
	</div>
	{#if impression.review}
		<p class="review">{impression.review}</p>
	{/if}
</div>

<style>
	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.75rem;
	}
	time {
		font-weight: 600;
	}
	.marker {
		display: inline-flex;
		gap: 0.25em;
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.marker.dnf {
		color: var(--text-muted);
	}
	.review {
		margin: 0.4rem 0 0;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
</style>
