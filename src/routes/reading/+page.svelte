<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import LibraryList from '#lib/components/LibraryList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Reading · apostillas</title>
</svelte:head>

<LibraryList
	title="Reading"
	items={data.reading}
	empty="You're not reading anything right now."
	sorts={[
		{ key: 'recent', label: 'Recently started' },
		{ key: 'title', label: 'Title' },
		{ key: 'author', label: 'Author' }
	]}
>
	{#snippet card(item)}
		<BookCard bookId={item.bookId} title={item.title} authors={item.authors} coverPath={item.coverPath} />
	{/snippet}
</LibraryList>
