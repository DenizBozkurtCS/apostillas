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

<h1>apostillas</h1>
<p>This library is private. Enter the password to continue.</p>

<form method="POST" class="login">
	<label>
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
	<button type="submit">Sign in</button>
</form>

<style>
	.login {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 20rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	label span {
		font-weight: 600;
	}
	input {
		padding: 0.5rem;
		font-size: 1rem;
	}
	.error {
		color: #b91c1c;
		margin: 0;
	}
	button {
		align-self: flex-start;
		padding: 0.5rem 1rem;
		font-weight: 600;
	}
</style>
