<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Shelf not found' : 'Error'} · apostillas</title>
</svelte:head>

<div class="missing">
	<h1>{page.status === 404 ? 'Shelf not found' : 'Something went wrong'}</h1>
	<p class="muted">
		{page.status === 404
			? 'There’s no Shelf at this address. If it was renamed, it has a new address now.'
			: page.error?.message}
	</p>
	<a class="button primary" href="/bookcase">Go to the Bookcase</a>
</div>

<style>
	.missing {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 4rem 1rem;
		text-align: center;
	}
	.missing h1,
	.missing p {
		margin: 0;
	}
</style>
