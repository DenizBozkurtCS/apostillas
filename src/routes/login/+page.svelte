<!--
	The login page: the one screen reachable without a session while the
	single-password gate is on. One password field, no user name (ADR-0001).
-->
<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Sign in · apostillas</title>
</svelte:head>

<div class="card">
	<h1>apostillas</h1>
	<p class="muted">This library is private. Enter the password to continue.</p>

	<form method="POST" class="stack">
		<label class="field">
			<span>Password</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				name="password"
				type="password"
				autocomplete="current-password"
				autofocus
				required
			/>
		</label>
		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}
		<button type="submit" class="primary">Sign in</button>
	</form>
</div>

<style>
	.card {
		width: 100%;
		max-width: 22rem;
		padding: 2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface-raised);
		box-shadow: var(--shadow);
	}
	h1 {
		font-size: 1.4rem;
	}
	p {
		margin: 0.4rem 0 1.5rem;
		font-size: 0.9rem;
	}
	.stack > button {
		align-self: stretch;
	}
</style>
