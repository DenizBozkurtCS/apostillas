<!--
	App shell: the navigation between the four Reading Status lists plus Add book.
	The brand links to the start page (/); the current list is highlighted.
	On narrow screens the tabs drop to their own horizontally scrolling row.
-->
<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// The login page is the one screen outside the shell: no nav, no log out.
	const onLogin = $derived(page.url.pathname === '/login');

	const tabs = [
		{ href: '/reading', label: 'Reading' },
		{ href: '/want', label: 'Want to read' },
		{ href: '/finished', label: 'Finished' },
		{ href: '/abandoned', label: 'Abandoned' },
		{ href: '/search', label: 'Search' }
	];

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

{#if !onLogin}
	<header>
		<div class="bar">
			<a class="brand" href="/">apostillas</a>
			<nav aria-label="Lists">
				{#each tabs as tab (tab.href)}
					<a href={tab.href} aria-current={isActive(tab.href) ? 'page' : undefined}>
						{tab.label}
					</a>
				{/each}
			</nav>
			<div class="end">
				<a class="button primary small" href="/add" aria-current={isActive('/add') ? 'page' : undefined}
					><span aria-hidden="true">+</span> Add book</a
				>
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
		gap: 1.5rem;
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
		gap: 0.15rem;
	}
	nav a {
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius);
		color: var(--text-muted);
		font-size: 0.9rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}
	nav a:hover {
		color: var(--text);
		background: var(--surface);
	}
	nav a[aria-current='page'] {
		color: var(--text);
		background: var(--surface);
		font-weight: 600;
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

	@media (max-width: 52rem) {
		.bar {
			flex-wrap: wrap;
			row-gap: 0.4rem;
			padding: 0.6rem 1rem 0;
		}
		nav {
			order: 3;
			flex-basis: 100%;
			overflow-x: auto;
			scrollbar-width: none;
			margin: 0 -1rem;
			padding: 0 0.75rem 0.5rem;
		}
		nav::-webkit-scrollbar {
			display: none;
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
