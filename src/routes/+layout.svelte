<!--
	App shell. The four Reading Status lists live under a "Library" dropdown
	(Reading, Bookstack, Books, Abandoned); Search and Add book sit beside it.
	The brand links to the start page (/). The dropdown is a disclosure: a button
	with aria-expanded and a list of links. It closes on Escape, on a click
	outside, and after navigating.
-->
<script lang="ts">
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import StatusIcon from '#lib/components/StatusIcon.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// The login page is the one screen outside the shell: no nav, no log out.
	const onLogin = $derived(page.url.pathname === '/login');

	const lists = [
		{ href: '/reading', label: 'Reading', icon: 'reading' },
		{ href: '/bookstack', label: 'Bookstack', icon: 'want' },
		{ href: '/books', label: 'Books', icon: 'finished' },
		{ href: '/abandoned', label: 'Abandoned', icon: 'abandoned' }
	] as const;

	// Exact match: /books/12 is a Book page, not the Books list.
	const currentList = $derived(lists.find((l) => l.href === page.url.pathname));

	let open = $state(false);
	let library: HTMLElement | undefined = $state();

	afterNavigate(() => {
		open = false;
	});

	function onWindowClick(event: MouseEvent) {
		if (open && library && !library.contains(event.target as Node)) open = false;
	}
	function onKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			open = false;
			library?.querySelector('button')?.focus();
		}
	}
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} />

{#if !onLogin}
	<header>
		<div class="bar">
			<a class="brand" href="/">apostillas</a>
			<nav aria-label="Main">
				<div class="library" bind:this={library}>
					<button
						type="button"
						class="nav-item trigger"
						class:active={currentList != null}
						aria-expanded={open}
						aria-controls="library-menu"
						onclick={() => (open = !open)}
					>
						Library
						<svg class="chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"
							><path
								d="M3 4.5l3 3 3-3"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/></svg
						>
					</button>
					{#if open}
						<ul id="library-menu" class="menu">
							{#each lists as list (list.href)}
								<li>
									<a
										href={list.href}
										aria-current={currentList?.href === list.href ? 'page' : undefined}
									>
										<StatusIcon status={list.icon} size={16} />
										{list.label}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<a
					class="nav-item"
					href="/search"
					aria-current={page.url.pathname.startsWith('/search') ? 'page' : undefined}>Search</a
				>
			</nav>
			<div class="end">
				<a class="button primary small" href="/add"><span aria-hidden="true">+</span> Add book</a>
				{#if data.gated}
					<form method="POST" action="/logout">
						<button type="submit" class="ghost small">Log out</button>
					</form>
				{/if}
			</div>
		</div>
	</header>
{/if}

<main class:bare={onLogin}>
	{@render children()}
</main>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--bg) 85%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
	}
	.bar {
		max-width: var(--content);
		margin: 0 auto;
		padding: 0.6rem 1.5rem;
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}
	.brand {
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: -0.02em;
		color: var(--text);
		text-decoration: none;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}
	.nav-item {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		border: none;
		border-radius: var(--radius);
		background: none;
		color: var(--text-muted);
		font-size: 0.9rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}
	.nav-item:hover,
	.trigger[aria-expanded='true'] {
		color: var(--text);
		background: var(--surface);
	}
	.nav-item[aria-current='page'],
	.nav-item.active {
		color: var(--text);
		background: var(--surface);
		font-weight: 600;
	}
	.chevron {
		flex-shrink: 0;
		transition: transform 0.15s;
	}
	nav,
	.nav-item {
		flex-shrink: 0;
	}
	.trigger[aria-expanded='true'] .chevron {
		transform: rotate(180deg);
	}

	.library {
		position: relative;
	}
	.menu {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 0;
		min-width: 12rem;
		margin: 0;
		padding: 0.3rem;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-raised);
		box-shadow: var(--shadow);
	}
	.menu a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.65rem;
		border-radius: var(--radius-sm);
		color: var(--text);
		font-size: 0.9rem;
		text-decoration: none;
	}
	.menu a :global(svg) {
		color: var(--text-muted);
	}
	.menu a:hover {
		background: var(--surface);
	}
	.menu a[aria-current='page'] {
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 600;
	}
	.menu a[aria-current='page'] :global(svg) {
		color: var(--accent);
	}

	.end {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.end form {
		margin: 0;
	}

	@media (max-width: 30rem) {
		.bar {
			padding: 0.6rem 1rem;
			gap: 0.5rem;
		}
		.nav-item {
			padding: 0.35rem 0.5rem;
		}
	}

	main {
		max-width: var(--content);
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}
	main.bare {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}
	@media (max-width: 52rem) {
		main {
			padding: 1.25rem 1rem 3rem;
		}
	}
</style>
