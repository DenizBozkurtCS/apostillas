<!-- Shown when a Reading Status list has no Books; always links to Add book. -->
<script lang="ts">
	let { message }: { message: string } = $props();
</script>

<div class="empty">
	<p>{message}</p>
	<a class="button primary" href="/add">Add a book</a>
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3.5rem 1.5rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-lg);
		text-align: center;
	}
	p {
		margin: 0;
		color: var(--text-muted);
	}
</style>
