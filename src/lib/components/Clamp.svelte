<!--
	Shows its content cut to about `lines` lines, with a "Show more" toggle only
	when the content is actually longer. Works with block content (rendered
	Markdown), which CSS line-clamp does not.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { lines = 6, children }: { lines?: number; children: Snippet } = $props();

	let el: HTMLElement | undefined = $state();
	let open = $state(false);
	let overflows = $state(false);

	$effect(() => {
		if (!el || open) return;
		const check = () => {
			if (el) overflows = el.scrollHeight > el.clientHeight + 1;
		};
		check();
		const observer = new ResizeObserver(check);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<div class="clamp" class:clamped={!open} class:fade={!open && overflows} style:--lines={lines} bind:this={el}>
	{@render children()}
</div>
{#if overflows || open}
	<button type="button" class="ghost small toggle" aria-expanded={open} onclick={() => (open = !open)}
		>{open ? 'Show less' : 'Show more'}</button
	>
{/if}

<style>
	.clamp.clamped {
		max-height: calc(var(--lines) * 1.6em);
		overflow: hidden;
	}
	.clamp.fade {
		mask-image: linear-gradient(to bottom, #000 70%, transparent);
	}
	.toggle {
		margin: 0.15rem 0 0 -0.5rem;
		color: var(--accent);
	}
</style>
