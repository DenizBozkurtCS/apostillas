<!-- The start page: one line, nothing else. The lists are in the header. -->
<svelte:head>
	<title>apostillas</title>
</svelte:head>

<p class="tagline">because goodreads was hideous.</p>

<style>
	/* Centred in the whole window, under the sticky header. */
	.tagline {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1rem;
		pointer-events: none;
		margin: 0;
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		text-align: center;
		color: var(--text-muted);
	}
</style>
