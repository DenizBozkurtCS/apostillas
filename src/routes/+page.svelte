<!-- The start page: one line, nothing else. The lists are in the header. -->
<svelte:head>
	<title>apostillas</title>
</svelte:head>

<p class="tagline">because goodreads was hideous.</p>

<style>
	.tagline {
		min-height: 60vh;
		display: grid;
		place-items: center;
		margin: 0;
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		text-align: center;
		color: var(--text-muted);
	}
</style>
