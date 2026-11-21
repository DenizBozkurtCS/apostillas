<!--
	App shell: the navigation between the four Reading Status lists plus Add book.
	Reading is the home screen (ADR / spec); the current list is highlighted.
-->
<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// The login page is the one screen outside the shell: no nav, no log out.
	const onLogin = $derived(page.url.pathname === '/login');

	const lists = [
		{ href: '/', label: 'Reading' },
		{ href: '/want', label: 'Want to read' },
		{ href: '/finished', label: 'Finished' },
		{ href: '/abandoned', label: 'Abandoned' }
	];

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

{#if !onLogin}
	<header>
		<a class="brand" href="/">apostillas</a>
		<nav>
			{#each lists as list (list.href)}
				<a href={list.href} aria-current={isActive(list.href) ? 'page' : undefined}>
					{list.label}
				</a>
			{/each}
			<a href="/search" aria-current={isActive('/search') ? 'page' : undefined}>Search</a>
			<a class="add" href="/add">Add book</a>
			{#if data.gated}
				<form method="POST" action="/logout" class="logout">
					<button type="submit">Log out</button>
				</form>
			{/if}
		</nav>
	</header>
{/if}

<main>
	{@render children()}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		color: #222;
	}
	header {
		border-bottom: 1px solid #e5e5e5;
		padding: 1rem 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 1rem 1.5rem;
	}
	.brand {
		font-weight: 700;
		font-size: 1.1rem;
		text-decoration: none;
		color: inherit;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: baseline;
	}
	nav a {
		text-decoration: none;
		color: #555;
	}
	nav a[aria-current='page'] {
		color: #222;
		font-weight: 600;
	}
	nav a:hover {
		color: #222;
	}
	.add {
		margin-left: auto;
		font-weight: 600;
		color: #1a56db;
	}
	.logout {
		margin: 0;
	}
	.logout button {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: #555;
		cursor: pointer;
	}
	.logout button:hover {
		color: #222;
	}
	main {
		max-width: 48rem;
		margin: 0 auto;
		padding: 1.5rem;
	}
</style>
