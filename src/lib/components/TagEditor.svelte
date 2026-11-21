<!--
	A Book's Tags as chips, each with × to remove it, and a "+ tag" input that
	suggests Tags already in use (a native datalist). Enter adds the typed Tag
	and keeps the input focused for the next one; Escape clears it.

	Posts to the page's `?/addTag` and `?/removeTag` actions with `enhance`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		tags,
		allTags,
		error = null
	}: { tags: string[]; allTags: string[]; error?: string | null } = $props();

	const uid = $props.id();
	const listId = `tag-suggestions-${uid}`;
	const suggestions = $derived(allTags.filter((t) => !tags.includes(t)));

	let input: HTMLInputElement | undefined = $state();
</script>

<div class="tags">
	<ul class="chips" aria-label="Tags">
		{#each tags as tag (tag)}
			<li class="chip">
				<span><span class="hash" aria-hidden="true">#</span>{tag}</span>
				<form method="POST" action="?/removeTag" use:enhance>
					<input type="hidden" name="tag" value={tag} />
					<button type="submit" class="remove" aria-label={`Remove tag ${tag}`} title="Remove"
						>×</button
					>
				</form>
			</li>
		{/each}
		<li>
			<form
				method="POST"
				action="?/addTag"
				class="add"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: result.type === 'success' });
						input?.focus();
					}}
			>
				<input
					bind:this={input}
					name="tag"
					type="text"
					list={listId}
					placeholder="+ tag"
					aria-label="Add a tag"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					maxlength="41"
					size="7"
					onkeydown={(e) => {
						if (e.key === 'Escape') {
							e.currentTarget.value = '';
							e.currentTarget.blur();
						}
					}}
				/>
				<datalist id={listId}>
					{#each suggestions as s (s)}
						<option value={s}></option>
					{/each}
				</datalist>
			</form>
		</li>
	</ul>
	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}
</div>

<style>
	.tags {
		margin-top: 0.35rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
		padding: 0.1rem 0.15rem 0.1rem 0.6rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 500;
	}
	.hash {
		opacity: 0.6;
	}
	.chip form,
	.add {
		margin: 0;
	}
	.remove {
		display: inline-grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: none;
		color: inherit;
		font-size: 1rem;
		line-height: 1;
		opacity: 0.6;
	}
	.remove:hover,
	.remove:focus-visible {
		opacity: 1;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.add input {
		width: auto;
		min-width: 5.5rem;
		padding: 0.2rem 0.65rem;
		border: 1px dashed var(--border-strong);
		border-radius: 999px;
		background: none;
		font-size: 0.85rem;
	}
	.add input:focus-visible {
		border-style: solid;
		min-width: 9rem;
	}
	.error {
		margin: 0.35rem 0 0;
		font-size: 0.85rem;
	}
</style>
