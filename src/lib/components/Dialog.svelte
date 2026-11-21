<!--
	A modal dialog over the page, built on the native <dialog> element so focus
	trapping, Escape, and the backdrop come from the browser. `open` is bindable:
	set it to show the dialog; it turns false when the reader closes it (×,
	Escape, or a click on the backdrop). `wide` makes it fill most of the
	window, for writing (the Note editor).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		wide = false,
		children
	}: { open?: boolean; title: string; wide?: boolean; children: Snippet } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const titleId = $props.id();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	// A click whose target is the <dialog> itself landed on the backdrop.
	function onClick(event: MouseEvent) {
		if (event.target === dialog) open = false;
	}
</script>

<dialog bind:this={dialog} class:wide aria-labelledby={titleId} onclose={() => (open = false)} onclick={onClick}>
	<div class="inner">
		<header>
			<h2 id={titleId}>{title}</h2>
			<button type="button" class="ghost small close" aria-label="Close" onclick={() => (open = false)}
				>×</button
			>
		</header>
		{#if open}
			{@render children()}
		{/if}
	</div>
</dialog>

<style>
	dialog {
		width: min(32rem, calc(100vw - 2rem));
		max-height: calc(100vh - 4rem);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface-raised);
		color: var(--text);
		box-shadow: var(--shadow);
	}
	dialog.wide {
		width: min(76rem, calc(100vw - 2rem));
		height: calc(100vh - 3rem);
		max-height: none;
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	.inner {
		padding: 1.25rem 1.4rem 1.5rem;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.close {
		font-size: 1.3rem;
		line-height: 1;
		padding: 0.1rem 0.5rem;
	}
</style>
