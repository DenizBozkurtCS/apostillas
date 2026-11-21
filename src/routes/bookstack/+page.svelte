<script lang="ts">
	import BookCard from '#lib/components/BookCard.svelte';
	import LibraryList from '#lib/components/LibraryList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Bookstack · apostillas</title>
</svelte:head>

<LibraryList
	title="Bookstack"
	items={data.wantToRead}
	empty="Your Bookstack is empty."
	sorts={[
		{ key: 'recent', label: 'Recently added' },
		{ key: 'recent:reversed', label: 'Oldest added' },
		{ key: 'title', label: 'Title A–Z' },
		{ key: 'title:reversed', label: 'Title Z–A' },
		{ key: 'author', label: 'Author A–Z' },
		{ key: 'author:reversed', label: 'Author Z–A' }
	]}
>
	{#snippet card(item)}
		<BookCard bookId={item.bookId} title={item.title} authors={item.authors} coverPath={item.coverPath} />
	{/snippet}
</LibraryList>
