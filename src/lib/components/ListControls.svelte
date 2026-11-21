<!--
	Sort and filter controls for a Library list. The filter box matches title
	and author as you type; typing `#` suggests the list's Tags, and Enter turns
	the highlighted (or best) suggestion into a chip (Backspace on an empty box
	removes the last chip). Books also gets minimum-rating and year-finished menus.

	State is bound from the list page and never goes into the URL.
-->
<script lang="ts">
	import { normalizeTag } from '#lib/domain/tags';
	import type { ListFilter, SortChoice } from '#lib/domain/listView';

	let {
		sort = $bindable(),
		filter = $bindable(),
		sorts,
		tags,
		years = null
	}: {
		sort: SortChoice;
		filter: ListFilter;
		sorts: { key: SortChoice; label: string }[];
		/** Tags on offer as suggestions. */
		tags: string[];
		/** Years finished, to offer the rating and year menus (Books only). */
		years?: number[] | null;
	} = $props();

	const uid = $props.id();
	const listId = `tag-options-${uid}`;

	let query = $state('');
	let active = $state(-1);
	let input: HTMLInputElement | undefined = $state();

	const typingTag = $derived(query.trimStart().startsWith('#'));
	const prefix = $derived(query.trim().replace(/^#+/, '').toLocaleLowerCase());
	const suggestions = $derived.by(() => {
		if (!typingTag) return [];
		const free = tags.filter((t) => !filter.tags.includes(t) && t.includes(prefix));
		// Tags starting with what was typed come first.
		return [...free.filter((t) => t.startsWith(prefix)), ...free.filter((t) => !t.startsWith(prefix))].slice(0, 8);
	});
	const open = $derived(typingTag && suggestions.length > 0);

	function setQuery(value: string) {
		query = value;
		active = -1;
		// While a Tag is being typed, it isn't a text filter.
		filter.text = typingTag ? '' : value;
	}

	function addTag(name: string) {
		if (!filter.tags.includes(name)) filter.tags = [...filter.tags, name];
		setQuery('');
		input?.focus();
	}

	function removeTag(name: string) {
		filter.tags = filter.tags.filter((t) => t !== name);
		input?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' && open) {
			e.preventDefault();
			active = (active + 1) % suggestions.length;
		} else if (e.key === 'ArrowUp' && open) {
			e.preventDefault();
			active = active <= 0 ? suggestions.length - 1 : active - 1;
		} else if (e.key === 'Enter' && typingTag) {
			e.preventDefault();
			// The highlighted suggestion, else an exact match, else the best
			// suggestion, else whatever was typed (which may match no Book).
			const typed = normalizeTag(query);
			const name =
				(active >= 0 ? suggestions[active] : null) ??
				(typed && suggestions.includes(typed) ? typed : null) ??
				suggestions[0] ??
				typed;
			if (name) addTag(name);
		} else if (e.key === 'Backspace' && query === '' && filter.tags.length > 0) {
			filter.tags = filter.tags.slice(0, -1);
		} else if (e.key === 'Escape' && query !== '') {
			setQuery('');
		}
	}

	const ratings = [
		{ value: 3, label: '3★ and up' },
		{ value: 4, label: '4★ and up' },
		{ value: 5, label: '5★ only' }
	];
</script>

<div class="controls">
	<div class="filter">
		<svg class="icon" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
			><path
				d="M4 5h16l-6 8v5l-4 2v-7z"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linejoin="round"
			/></svg
		>
		{#each filter.tags as tag (tag)}
			<span class="chip"
				><span class="hash" aria-hidden="true">#</span>{tag}<button
					type="button"
					aria-label={`Remove tag filter ${tag}`}
					onclick={() => removeTag(tag)}>×</button
				></span
			>
		{/each}
		<input
			bind:this={input}
			type="text"
			value={query}
			oninput={(e) => setQuery(e.currentTarget.value)}
			onkeydown={onKeydown}
			onblur={() => (active = -1)}
			placeholder={filter.tags.length
				? 'Add another #tag…'
				: tags.length
					? 'Filter by title, author or #tag'
					: 'Filter by title or author'}
			aria-label="Filter by title, author or #tag"
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listId}
			aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
		/>
		{#if open}
			<ul class="suggestions" id={listId} role="listbox" aria-label="Tags">
				{#each suggestions as s, i (s)}
					<li
						id={`${listId}-${i}`}
						role="option"
						aria-selected={i === active}
						onmousedown={(e) => {
							e.preventDefault();
							addTag(s);
						}}
					>
						<span class="hash" aria-hidden="true">#</span>{s}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if years}
		<select bind:value={filter.minRating} aria-label="Minimum rating">
			<option value={null}>Any rating</option>
			{#each ratings as r (r.value)}
				<option value={r.value}>{r.label}</option>
			{/each}
		</select>
		{#if years.length > 0}
			<select bind:value={filter.year} aria-label="Year finished">
				<option value={null}>Any year</option>
				{#each years as y (y)}
					<option value={y}>{y}</option>
				{/each}
			</select>
		{/if}
	{/if}

	<label class="sort">
		<span>Sort</span>
		<select bind:value={sort}>
			{#each sorts as s (s.key)}
				<option value={s.key}>{s.label}</option>
			{/each}
		</select>
	</label>
</div>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1.75rem;
	}
	.filter {
		position: relative;
		flex: 1 1 18rem;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.4rem 0.3rem 2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.filter:focus-within {
		border-color: var(--accent);
		background: var(--bg);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	.icon {
		position: absolute;
		left: 0.7rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-faint);
	}
	.filter input {
		flex: 1 1 8rem;
		min-width: 6rem;
		width: auto;
		padding: 0.25rem 0.2rem;
		border: none;
		background: none;
		box-shadow: none;
		font-size: 0.9rem;
	}
	.filter input:focus-visible {
		outline: none;
		box-shadow: none;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0.05rem 0.1rem 0.05rem 0.55rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 500;
	}
	.hash {
		opacity: 0.6;
	}
	.chip button {
		display: inline-grid;
		place-items: center;
		width: 1.3rem;
		height: 1.3rem;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: none;
		color: inherit;
		font-size: 1rem;
		line-height: 1;
		opacity: 0.6;
	}
	.chip button:hover,
	.chip button:focus-visible {
		opacity: 1;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.suggestions {
		position: absolute;
		z-index: 5;
		top: calc(100% + 0.3rem);
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
	.suggestions li {
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		cursor: pointer;
	}
	.suggestions li:hover,
	.suggestions li[aria-selected='true'] {
		background: var(--accent-soft);
		color: var(--accent);
	}
	select {
		width: auto;
		padding-top: 0.45rem;
		padding-bottom: 0.45rem;
		font-size: 0.9rem;
	}
	.sort {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	@media (max-width: 40rem) {
		.filter {
			flex-basis: 100%;
		}
		.sort {
			margin-left: 0;
		}
	}
</style>
