<script lang="ts">
	import { formatDay } from '#lib/format';
	import Stars from '#lib/components/Stars.svelte';
	import StarInput from '#lib/components/StarInput.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const book = $derived(data.book);
	const byline = $derived(book.authors.join(', ') || 'Unknown author');

	/** Which status panel (Finish / Log past read) is open under the actions. */
	let panel = $state<'finish' | 'logPast' | null>(null);
	/** Which Read, Quote or Note is being edited in place, e.g. `quote-12`. */
	let editing = $state<string | null>(null);

	function togglePanel(p: 'finish' | 'logPast') {
		panel = panel === p ? null : p;
	}
	function toggleEdit(key: string) {
		editing = editing === key ? null : key;
	}

	/** Human label for a Read's outcome. */
	function outcomeLabel(outcome: 'open' | 'finished' | 'abandoned'): string {
		return outcome === 'open' ? 'Reading' : outcome === 'finished' ? 'Finished' : 'Abandoned';
	}

	/** Short label for a Read, used in the "link to Read" picker and annotations. */
	function readLabel(r: PageData['reads'][number]): string {
		const dates = [r.startDate, r.endDate].filter(Boolean).map(formatDay).join(' – ');
		return dates ? `${outcomeLabel(r.outcome)} · ${dates}` : outcomeLabel(r.outcome);
	}

	/** The label of the Read an annotation is linked to, or '' when unlinked. */
	function readLabelFor(readId: number | null): string {
		if (readId == null) return '';
		const r = data.reads.find((x) => x.id === readId);
		return r ? readLabel(r) : '';
	}

	/** Cancel a destructive form submit unless the reader confirms. */
	function confirmSubmit(message: string) {
		return (event: SubmitEvent) => {
			if (!confirm(message)) event.preventDefault();
		};
	}
</script>

<svelte:head>
	<title>{book.title} · apostillas</title>
</svelte:head>

{#snippet readLinkField(selected: number | null)}
	{#if data.reads.length > 0}
		<label class="field">
			<span>Linked Read (optional)</span>
			<select name="readId">
				<option value="" selected={selected == null}>Not linked to a Read</option>
				{#each data.reads as r (r.id)}
					<option value={r.id} selected={selected === r.id}>{readLabel(r)}</option>
				{/each}
			</select>
		</label>
	{/if}
{/snippet}

{#snippet itemTools(key: string, deleteAction: string, idName: string, id: number, message: string)}
	<div class="tools">
		<button
			type="button"
			class="ghost small"
			aria-expanded={editing === key}
			onclick={() => toggleEdit(key)}>{editing === key ? 'Cancel' : 'Edit'}</button
		>
		<form method="POST" action={deleteAction} onsubmit={confirmSubmit(message)}>
			<input type="hidden" name={idName} value={id} />
			<button type="submit" class="ghost small danger">Delete</button>
		</form>
	</div>
{/snippet}

<article class="book">
	<header class="hero">
		{#if book.coverPath}
			<img class="cover" src={`/${book.coverPath}`} alt="" width="200" height="300" />
		{:else}
			<div class="cover cover--none" aria-hidden="true"><span>{book.title}</span></div>
		{/if}

		<div class="meta">
			<span class="badge">{data.status}</span>
			<h1>{book.title}</h1>
			<p class="byline">{byline}</p>
			<p class="facts">
				{#if book.pageCount}<span>{book.pageCount} pages</span>{/if}
				{#if book.isbn}<span>ISBN {book.isbn}</span>{/if}
				<span>Added {formatDay(book.createdAt)}</span>
			</p>
			{#if book.whyRecommended}
				<p class="why">“{book.whyRecommended}”</p>
			{/if}

			<!-- Actions by Reading Status -->
			<div class="actions">
				{#if data.status === 'Want to read'}
					<form method="POST" action="?/start">
						<button type="submit" class="primary">Start reading</button>
					</form>
					<button
						type="button"
						aria-expanded={panel === 'logPast'}
						onclick={() => togglePanel('logPast')}>Log past read</button
					>
				{:else if data.status === 'Reading'}
					<button
						type="button"
						class="primary"
						aria-expanded={panel === 'finish'}
						onclick={() => togglePanel('finish')}>Finish</button
					>
					<form method="POST" action="?/abandon">
						<button type="submit">Abandon</button>
					</form>
					<form
						method="POST"
						action="?/backToWant"
						onsubmit={confirmSubmit(
							`${book.title} will go back to Want to read. Its open Read is removed; Quotes and Notes stay.`
						)}
					>
						<button type="submit" class="ghost">Back to Want to read</button>
					</form>
				{:else}
					<form method="POST" action="?/start">
						<button type="submit" class="primary">Start again</button>
					</form>
				{/if}
			</div>

			{#if panel === 'logPast' && data.status === 'Want to read'}
				<form method="POST" action="?/logPast" class="stack panel">
					<label class="field">
						<span>Finished on</span>
						<input name="endDate" type="date" required />
					</label>
					<div class="field">
						<span>Rating</span>
						<StarInput />
					</div>
					<label class="check">
						<input name="readBefore" type="checkbox" />
						<span>I've read this before</span>
					</label>
					<button type="submit" class="primary">Log past read</button>
				</form>
			{:else if panel === 'finish' && data.status === 'Reading'}
				<form method="POST" action="?/finish" class="stack panel">
					<label class="field">
						<span>Finished on</span>
						<input name="endDate" type="date" />
						<small>Leave blank for today.</small>
					</label>
					<div class="field">
						<span>Rating</span>
						<StarInput />
					</div>
					<label class="check">
						<input name="readBefore" type="checkbox" />
						<span>I've read this before</span>
					</label>
					<button type="submit" class="primary">Finish</button>
				</form>
			{/if}
		</div>
	</header>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	{#if book.description}
		<p class="description">{book.description}</p>
	{/if}

	<!-- Read history -->
	<section>
		<div class="section-head">
			<h2>Reads</h2>
			{#if data.reads.length > 0}<span class="count">{data.reads.length}</span>{/if}
		</div>
		{#if data.reads.length === 0}
			<p class="muted">No Reads yet.</p>
		{:else}
			<ul class="items">
				{#each data.reads as r (r.id)}
					{@const key = `read-${r.id}`}
					<li class="item">
						<div class="item-row">
							<div class="read-line">
								<span class="outcome" data-outcome={r.outcome}>{outcomeLabel(r.outcome)}</span>
								<span class="muted">
									{#if r.startDate}{formatDay(r.startDate)}{/if}
									{#if r.startDate && r.endDate}&ndash;{/if}
									{#if r.endDate}{formatDay(r.endDate)}{/if}
									{#if r.outcome === 'finished' && !r.startDate && !r.endDate}date unknown{/if}
								</span>
								{#if r.outcome === 'finished' && (r.startDate || r.endDate)}
									<!-- Clears both dates: the Read becomes "date unknown" (read long ago). -->
									<form method="POST" action="?/editRead" class="inline">
										<input type="hidden" name="readId" value={r.id} />
										<input type="hidden" name="startDate" value="" />
										<input type="hidden" name="endDate" value="" />
										<button
											type="submit"
											class="ghost small clear-dates"
											title="Remove the dates"
											aria-label="Remove the dates">×</button
										>
									</form>
								{/if}
								{#if r.rating != null}
									<Stars rating={r.rating} />
								{/if}
								{#if r.isReread}
									<span class="reread" title="Reread">↻ Reread</span>
								{/if}
							</div>
							{@render itemTools(key, '?/deleteRead', 'readId', r.id, r.deleteMessage)}
						</div>

						{#if editing === key}
							<form method="POST" action="?/editRead" class="stack edit">
								<input type="hidden" name="readId" value={r.id} />
								<div class="row">
									{#if r.outcome !== 'finished' || r.startDate !== null}
										<label class="field">
											<span>Started on</span>
											<input name="startDate" type="date" value={r.startDate ?? ''} />
										</label>
									{/if}
									{#if r.outcome !== 'open'}
										<label class="field">
											<span>Ended on</span>
											<input name="endDate" type="date" value={r.endDate ?? ''} />
										</label>
									{/if}
								</div>
								<div class="field">
									<span>Rating</span>
									<StarInput value={r.rating} />
								</div>
								<button type="submit" class="primary small">Save</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Quotes -->
	<section>
		<div class="section-head">
			<h2>Quotes</h2>
			{#if data.quotes.length > 0}<span class="count">{data.quotes.length}</span>{/if}
		</div>
		{#if form?.quoteError}
			<p class="error" role="alert">{form.quoteError}</p>
		{/if}

		{#if data.canAnnotate}
			<details class="adder" open={Boolean(form?.quoteError)}>
				<summary class="button small">+ Add a Quote</summary>
				<form method="POST" action="?/addQuote" class="stack panel">
					<label class="field">
						<span>Quote</span>
						<textarea name="text" rows="3" required></textarea>
					</label>
					<label class="field">
						<span>Page or location (optional)</span>
						<input name="location" type="text" />
					</label>
					{@render readLinkField(data.defaultReadId)}
					<button type="submit" class="primary small">Add Quote</button>
				</form>
			</details>
		{:else}
			<p class="muted hint">Start this Book to add Quotes. Existing Quotes stay here.</p>
		{/if}

		{#if data.quotes.length === 0}
			<p class="muted">No Quotes yet.</p>
		{:else}
			<ul class="items">
				{#each data.quotes as q (q.id)}
					{@const key = `quote-${q.id}`}
					<li class="item">
						<blockquote class="quote-text">{q.text}</blockquote>
						<div class="item-row">
							<div class="item-meta">
								{#if q.location}<span>{q.location}</span>{/if}
								{#if readLabelFor(q.readId)}<span>↳ {readLabelFor(q.readId)}</span>{/if}
							</div>
							{@render itemTools(key, '?/deleteQuote', 'quoteId', q.id, 'Delete this Quote?')}
						</div>
						{#if editing === key}
							<form method="POST" action="?/editQuote" class="stack edit">
								<input type="hidden" name="quoteId" value={q.id} />
								<label class="field">
									<span>Quote</span>
									<textarea name="text" rows="3" required>{q.text}</textarea>
								</label>
								<label class="field">
									<span>Page or location (optional)</span>
									<input name="location" type="text" value={q.location ?? ''} />
								</label>
								{@render readLinkField(q.readId)}
								<button type="submit" class="primary small">Save</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Notes -->
	<section>
		<div class="section-head">
			<h2>Notes</h2>
			{#if data.notes.length > 0}<span class="count">{data.notes.length}</span>{/if}
		</div>
		{#if form?.noteError}
			<p class="error" role="alert">{form.noteError}</p>
		{/if}

		{#if data.canAnnotate}
			<details class="adder" open={Boolean(form?.noteError)}>
				<summary class="button small">+ Add a Note</summary>
				<form method="POST" action="?/addNote" class="stack panel">
					<label class="field">
						<span>Note (Markdown)</span>
						<textarea name="body" rows="5" required></textarea>
					</label>
					{@render readLinkField(data.defaultReadId)}
					<button type="submit" class="primary small">Add Note</button>
				</form>
			</details>
		{:else}
			<p class="muted hint">Start this Book to add Notes. Existing Notes stay here.</p>
		{/if}

		{#if data.notes.length === 0}
			<p class="muted">No Notes yet.</p>
		{:else}
			<ul class="items">
				{#each data.notes as n (n.id)}
					{@const key = `note-${n.id}`}
					<li class="item">
						<!-- Sanitised server-side in src/lib/markdown.ts (HTML-escaped by construction). -->
						<div class="note-body">{@html n.html}</div>
						<div class="item-row">
							<div class="item-meta">
								{#if readLabelFor(n.readId)}<span>↳ {readLabelFor(n.readId)}</span>{/if}
							</div>
							{@render itemTools(key, '?/deleteNote', 'noteId', n.id, 'Delete this Note?')}
						</div>
						{#if editing === key}
							<form method="POST" action="?/editNote" class="stack edit">
								<input type="hidden" name="noteId" value={n.id} />
								<label class="field">
									<span>Note (Markdown)</span>
									<textarea name="body" rows="5" required>{n.body}</textarea>
								</label>
								{@render readLinkField(n.readId)}
								<button type="submit" class="primary small">Save</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Manage -->
	<section class="manage">
		<h2>Manage</h2>

		<details class="manage-item" open={Boolean(form?.metaError)}>
			<summary>Edit details</summary>
			<div class="manage-body">
				<form method="POST" action="?/updateMeta" class="stack">
					{#if form?.metaError}
						<p class="error" role="alert">{form.metaError}</p>
					{/if}
					<label class="field">
						<span>Title</span>
						<input name="title" type="text" value={book.title} required />
					</label>
					<label class="field">
						<span>Author(s), separated by commas</span>
						<input name="authors" type="text" value={book.authors.join(', ')} />
					</label>
					<div class="row">
						<label class="field">
							<span>ISBN</span>
							<input name="isbn" type="text" value={book.isbn ?? ''} />
						</label>
						<label class="field">
							<span>Page count</span>
							<input name="pageCount" type="number" min="1" value={book.pageCount ?? ''} />
						</label>
					</div>
					<label class="field">
						<span>Description</span>
						<textarea name="description" rows="4">{book.description}</textarea>
					</label>
					<label class="field">
						<span>Why / recommended by</span>
						<input name="whyRecommended" type="text" value={book.whyRecommended ?? ''} />
					</label>
					<button type="submit" class="primary small">Save details</button>
				</form>

				{#if book.workId}
					<form
						method="POST"
						action="?/syncMeta"
						class="sync"
						onsubmit={confirmSubmit(
							'Replace the title, authors, description, ISBN and page count with Open Library\'s current data? "Why / recommended by" and the cover stay as they are.'
						)}
					>
						<button type="submit" class="small">Sync details from Open Library</button>
					</form>
				{/if}
			</div>
		</details>

		<details
			class="manage-item"
			open={data.editionCovers != null || Boolean(form?.coverError)}
		>
			<summary>Change cover</summary>
			<div class="manage-body">
				{#if form?.coverError}
					<p class="error" role="alert">{form.coverError}</p>
				{/if}

				<form method="POST" action="?/uploadCover" enctype="multipart/form-data" class="stack">
					<label class="field">
						<span>Upload an image (JPEG, PNG, GIF or WebP, max 5 MB)</span>
						<input
							name="cover"
							type="file"
							accept="image/jpeg,image/png,image/gif,image/webp"
							required
						/>
					</label>
					<button type="submit" class="small">Upload cover</button>
				</form>

				{#if book.workId}
					<div class="editions">
						<p class="muted">Or pick the real cover from one of this work's editions:</p>
						{#if data.editionCovers == null}
							<a class="button small" href="?covers=1">Show edition covers</a>
						{:else if data.editionCovers.length === 0}
							<p class="muted">No edition covers were found.</p>
						{:else}
							<ul class="edition-covers">
								{#each data.editionCovers as edition (edition.coverUrl)}
									<li>
										<form method="POST" action="?/pickCover">
											<input type="hidden" name="coverUrl" value={edition.coverUrl} />
											<button type="submit" class="edition-cover" title={edition.label}>
												<img
													src={edition.coverUrl}
													alt={edition.label}
													width="80"
													height="120"
													loading="lazy"
												/>
											</button>
										</form>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
		</details>

		<div class="manage-item danger-zone">
			<div>
				<strong>Delete this Book</strong>
				<p class="muted">Its Reads, Quotes, and Notes are deleted too.</p>
			</div>
			<form
				method="POST"
				action="?/deleteBook"
				onsubmit={confirmSubmit(
					`Delete ${book.title}? Its Reads, Quotes, and Notes will be deleted too. This cannot be undone.`
				)}
			>
				<button type="submit" class="danger small">Delete</button>
			</form>
		</div>
	</section>
</article>

<style>
	.book {
		max-width: var(--content-narrow);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	/* ---------- Hero ---------- */
	.hero {
		display: grid;
		grid-template-columns: 10rem 1fr;
		gap: 2rem;
		align-items: start;
	}
	.cover {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow:
			0 0 0 1px var(--border),
			0 6px 20px rgb(0 0 0 / 0.12);
	}
	.cover--none {
		display: flex;
		align-items: center;
		padding: 1rem;
		background: linear-gradient(160deg, var(--surface), var(--accent-soft));
		font-weight: 650;
		line-height: 1.25;
	}
	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
		min-width: 0;
	}
	.meta h1 {
		font-size: 1.85rem;
		margin-top: 0.25rem;
	}
	.byline {
		margin: 0;
		font-size: 1.05rem;
		color: var(--text-muted);
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0;
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: var(--text-faint);
	}
	.facts span + span::before {
		content: '·';
		margin: 0 0.5rem;
	}
	.why {
		margin: 0.25rem 0 0;
		font-style: italic;
		color: var(--text-muted);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.actions form {
		margin: 0;
	}
	.panel {
		width: 100%;
		max-width: 22rem;
		margin-top: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	@media (max-width: 36rem) {
		.hero {
			grid-template-columns: 7rem 1fr;
			gap: 1.25rem;
		}
		.meta h1 {
			font-size: 1.4rem;
		}
	}

	.description {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.65;
		color: var(--text-muted);
	}

	/* ---------- Sections ---------- */
	.section-head {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding-bottom: 0.6rem;
		margin-bottom: 0.9rem;
		border-bottom: 1px solid var(--border);
	}
	.section-head .count {
		color: var(--text-faint);
		font-size: 0.9rem;
	}
	.hint {
		font-size: 0.9rem;
	}
	.adder {
		margin-bottom: 1rem;
	}
	.adder[open] > summary {
		background: var(--surface);
	}
	.adder .panel {
		max-width: none;
	}

	.items {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	.item {
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}
	.item:last-child {
		border-bottom: none;
	}
	.item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		min-height: 2rem;
	}
	.tools {
		display: flex;
		gap: 0.1rem;
		flex-shrink: 0;
		opacity: 0.6;
		transition: opacity 0.12s;
	}
	.item:hover .tools,
	.tools:focus-within {
		opacity: 1;
	}
	@media (hover: none) {
		.tools {
			opacity: 1;
		}
	}
	.tools form,
	form.inline {
		margin: 0;
		display: inline;
	}
	.edit {
		margin-top: 0.6rem;
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
	}

	.read-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.75rem;
		font-size: 0.95rem;
	}
	.outcome {
		font-weight: 600;
	}
	.outcome[data-outcome='open'] {
		color: var(--accent);
	}
	.outcome[data-outcome='abandoned'] {
		color: var(--text-muted);
	}
	.clear-dates {
		padding: 0 0.35rem;
		margin-left: -0.5rem;
		line-height: 1.2;
		color: var(--text-faint);
	}
	.reread {
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.item-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.9rem;
		font-size: 0.82rem;
		color: var(--text-faint);
	}
	.quote-text {
		margin: 0 0 0.35rem;
		padding-left: 1rem;
		border-left: 3px solid var(--accent);
		white-space: pre-wrap;
		font-size: 1.02rem;
		line-height: 1.6;
	}
	.note-body {
		line-height: 1.6;
		margin-bottom: 0.35rem;
	}
	.note-body :global(p) {
		margin: 0 0 0.6rem;
	}
	.note-body :global(:last-child) {
		margin-bottom: 0;
	}
	.note-body :global(code) {
		font-family: var(--font-mono);
		font-size: 0.88em;
		background: var(--surface);
		padding: 0.1em 0.3em;
		border-radius: var(--radius-sm);
	}
	.note-body :global(pre) {
		background: var(--surface);
		padding: 0.75rem;
		border-radius: var(--radius);
		overflow-x: auto;
	}
	.note-body :global(pre code) {
		background: none;
		padding: 0;
	}
	.note-body :global(blockquote) {
		margin: 0 0 0.6rem;
		padding-left: 0.9rem;
		border-left: 3px solid var(--border-strong);
		color: var(--text-muted);
	}

	/* ---------- Manage ---------- */
	.manage {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.manage h2 {
		padding: 0.85rem 1.1rem;
		font-size: 0.8rem;
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.manage-item {
		border-bottom: 1px solid var(--border);
	}
	.manage-item:last-child {
		border-bottom: none;
	}
	.manage-item > summary {
		padding: 0.85rem 1.1rem;
		font-weight: 550;
	}
	.manage-item > summary:hover {
		background: var(--surface);
	}
	.manage-body {
		padding: 0.25rem 1.1rem 1.25rem;
	}
	.sync {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px dashed var(--border);
	}
	.editions {
		margin-top: 1.25rem;
	}
	.editions p {
		margin: 0 0 0.6rem;
		font-size: 0.9rem;
	}
	.edition-covers {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.edition-covers form {
		margin: 0;
	}
	.edition-cover {
		padding: 0;
		border: 2px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
	}
	.edition-cover:hover {
		border-color: var(--accent);
		background: none;
	}
	.edition-cover img {
		display: block;
		width: 80px;
		height: 120px;
		object-fit: cover;
		background: var(--surface);
		border-radius: 2px;
	}
	.danger-zone {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1.1rem;
	}
	.danger-zone p {
		margin: 0.1rem 0 0;
		font-size: 0.85rem;
	}
	.danger-zone form {
		margin: 0;
	}
</style>
