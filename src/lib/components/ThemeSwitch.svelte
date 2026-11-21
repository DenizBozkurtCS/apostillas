<!--
	Light/dark switch for the navbar: a pill with a sun and a moon, the knob on
	the current theme. Clicking flips it, sets data-theme on <html> and keeps
	the choice in this browser (app.html applies it before the page paints).
	Until the reader picks, the theme follows the system.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	let dark = $state(false);
	/** No knob animation for the first paint, only for clicks. */
	let ready = $state(false);

	onMount(() => {
		const chosen = document.documentElement.dataset.theme;
		dark = chosen ? chosen === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
		requestAnimationFrame(() => (ready = true));
	});

	function toggle() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* private mode: the choice lasts for this page only */
		}
	}
</script>

<button
	type="button"
	class="theme-switch"
	class:dark
	class:ready
	role="switch"
	aria-checked={dark}
	aria-label="Dark mode"
	title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={toggle}
>
	<span class="knob" aria-hidden="true"></span>
	<svg class="icon sun" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"
		><circle cx="12" cy="12" r="4.2" fill="currentColor" /><g
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			><path
				d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
			/></g
		></svg
	>
	<svg class="icon moon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"
		><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" fill="currentColor" /></svg
	>
</button>

<style>
	.theme-switch {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
		width: 3.6rem;
		height: 1.9rem;
		padding: 0 0.45rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		cursor: pointer;
	}
	.theme-switch:hover {
		border-color: var(--border-strong);
	}
	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: calc(1.9rem - 6px);
		height: calc(1.9rem - 6px);
		border-radius: 50%;
		background: var(--surface-raised);
		box-shadow:
			0 0 0 1px var(--border),
			0 1px 3px rgb(0 0 0 / 0.15);
	}
	.ready .knob {
		transition: transform 0.2s ease;
	}
	.dark .knob {
		transform: translateX(calc(3.6rem - 1.9rem));
	}
	.icon {
		position: relative;
		z-index: 1;
		color: var(--text-faint);
		transition: color 0.2s;
	}
	.theme-switch:not(.dark) .sun {
		color: var(--accent);
	}
	.dark .moon {
		color: var(--accent);
	}
</style>
