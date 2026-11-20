<!-- Shown when a Reading Status list has no Books; always links to Add book. -->
<script lang="ts">
	let { message }: { message: string } = $props();
</script>

<p class="empty">
	{message} <a href="/add">Add a book</a>.
</p>

<style>
	.empty {
		color: #555;
	}
</style>
