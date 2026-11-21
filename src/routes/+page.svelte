<!--
	The start page: the Quote of the day, one of the reader's own Quotes picked
	at random and the same all day, in quotation marks and nothing else. With no
	Quotes yet, the page is empty. The lists are in the header.
-->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>apostillas</title>
</svelte:head>

{#if data.quote}
	<p class="quote">“{data.quote.text}”</p>
{/if}

<style>
	/* Centred in the whole window, under the sticky header. */
	.quote {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 6rem 1.5rem 1rem;
		pointer-events: none;
		margin: 0;
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.3;
		text-align: center;
		text-wrap: balance;
		white-space: pre-wrap;
		color: var(--text-muted);
	}
</style>
