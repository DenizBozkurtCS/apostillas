<!--
	A small line icon for a Reading Status: bookmark (Want to read / Bookstack),
	open book (Reading), check (Finished). Decorative:
	the button or link around it carries the label.
-->
<script lang="ts">
	let {
		status,
		size = 18
	}: { status: 'want' | 'reading' | 'finished'; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#if status === 'want'}
		<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
	{:else if status === 'reading'}
		<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
		<path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
	{:else}
		<path d="M20 6L9 17l-5-5" />
	{/if}
</svg>
