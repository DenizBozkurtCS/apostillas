<!--
	A rating shown as five stars, filled to the rating, half stars included.
	Grey stars sit underneath; a gold copy is clipped to rating / 5 of the width.
-->
<script lang="ts">
	import { formatRating } from '#lib/format';

	let { rating }: { rating: number } = $props();

	const label = $derived(`${formatRating(rating)} out of 5 stars`);
</script>

<span class="stars" role="img" aria-label={label} title={label}>
	<span class="empty" aria-hidden="true">★★★★★</span>
	<span class="filled" aria-hidden="true" style:width={`${(rating / 5) * 100}%`}>★★★★★</span>
</span>

<style>
	.stars {
		position: relative;
		display: inline-block;
		line-height: 1;
		letter-spacing: 1px;
		white-space: nowrap;
	}
	.empty {
		color: #d6d6d6;
	}
	.filled {
		position: absolute;
		inset: 0 auto 0 0;
		overflow: hidden;
		color: #b8860b;
	}
</style>
