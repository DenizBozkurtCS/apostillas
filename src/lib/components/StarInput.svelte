<!--
	A rating picker: five stars, clickable by halves, plus "Clear" for unrated.
	It is a plain radio group named `name`, so a form submits `""` (unrated) or
	one of RATING_STEPS exactly like the old <select>. Each star is two labels,
	its left half (n−½) and right half (n); `:has()` fills every half up to the
	checked one, and up to the hovered one while the pointer is over the stars.
-->
<script lang="ts">
	import { formatRating, RATING_STEPS } from '#lib/format';

	let { name = 'rating', value = null }: { name?: string; value?: number | null } = $props();

	const uid = $props.id();
</script>

<div class="star-input" role="radiogroup" aria-label="Rating">
	<input
		type="radio"
		class="visually-hidden"
		{name}
		value=""
		id={`${uid}-none`}
		checked={value == null}
	/>
	{#each RATING_STEPS as n (n)}
		<input
			type="radio"
			class="visually-hidden"
			{name}
			value={n}
			id={`${uid}-${n}`}
			checked={value === n}
		/>
		<label
			for={`${uid}-${n}`}
			class={Number.isInteger(n) ? 'half-right' : 'half-left'}
			title={`${formatRating(n)} of 5`}
			><span aria-hidden="true">★</span><span class="visually-hidden"
				>{formatRating(n)} of 5 stars</span
			></label
		>
	{/each}
	<label for={`${uid}-none`} class="clear">Clear</label>
</div>

<style>
	.star-input {
		display: inline-flex;
		align-items: center;
	}
	label {
		cursor: pointer;
	}
	/* Each half label shows one half of a 1em-wide star glyph. */
	.half-left,
	.half-right {
		display: inline-block;
		width: 0.5em;
		overflow: hidden;
		font-size: 1.6rem;
		line-height: 1;
		color: var(--star-empty);
	}
	.half-left span[aria-hidden],
	.half-right span[aria-hidden] {
		display: inline-block;
		width: 1em;
		text-align: center;
	}
	.half-right {
		margin-right: 0.08em;
	}
	.half-right span[aria-hidden] {
		margin-left: -0.5em;
	}

	/* Fill up to and including the checked half. */
	input:checked + label,
	label:has(~ input:checked) {
		color: var(--star);
	}
	/* While hovering, preview up to the hovered half instead. */
	.star-input:has(.half-left:hover, .half-right:hover) :is(.half-left, .half-right) {
		color: var(--star-empty);
	}
	.star-input:has(.half-left:hover, .half-right:hover) :is(.half-left, .half-right):hover,
	.star-input:has(.half-left:hover, .half-right:hover)
		:is(.half-left, .half-right):has(~ :is(.half-left, .half-right):hover) {
		color: var(--star);
	}

	input:focus-visible + label {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
		border-radius: 2px;
	}

	.clear {
		margin-left: 0.6rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.clear:hover {
		color: var(--text);
	}
	/* Nothing to clear when unrated. */
	.star-input:has(input[value='']:checked) .clear {
		visibility: hidden;
	}
</style>
