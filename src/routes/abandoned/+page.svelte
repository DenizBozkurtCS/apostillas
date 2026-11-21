<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import LibraryList from '#lib/components/LibraryList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Abandoned · apostillas</title>
</svelte:head>

<LibraryList
	title="Abandoned"
	items={data.abandoned}
	empty="You haven't abandoned anything."
	sorts={[
		{ key: 'recent', label: 'Recently abandoned' },
		{ key: 'title', label: 'Title' },
		{ key: 'author', label: 'Author' }
	]}
>
	{#snippet card(item)}
		<BookCard bookId={item.bookId} title={item.title} authors={item.authors} coverPath={item.coverPath} />
	{/snippet}
</LibraryList>
