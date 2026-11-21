<script lang="ts">
	import { formatDay, ratingStars } from '#lib/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const book = $derived(data.book);
	const byline = $derived(book.authors.join(', ') || 'Unknown author');

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

<article class="book">
	<div class="header">
		{#if book.coverPath}
			<img class="cover" src={`/${book.coverPath}`} alt="" width="120" height="180" />
		{:else}
			<div class="cover cover--none" aria-hidden="true"></div>
		{/if}

		<div class="meta">
			<span class="status">{data.status}</span>
			<h1>{book.title}</h1>
			<p class="byline">{byline}</p>
			<dl class="edition">
				{#if book.isbn}
					<dt>ISBN</dt>
					<dd>{book.isbn}</dd>
				{/if}
				{#if book.pageCount}
					<dt>Pages</dt>
					<dd>{book.pageCount}</dd>
				{/if}
				<dt>Added</dt>
				<dd>{formatDay(book.createdAt)}</dd>
			</dl>
			{#if book.whyRecommended}
				<p class="why"><strong>Why:</strong> {book.whyRecommended}</p>
			{/if}
		</div>
	</div>

	{#if book.description}
		<p class="description">{book.description}</p>
	{/if}

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	<!-- Actions by Reading Status -->
	<section class="actions">
		{#if data.status === 'Want to read'}
			<form method="POST" action="?/start">
				<button type="submit">Start</button>
			</form>

			<details class="disclosure">
				<summary>Log past read</summary>
				<form method="POST" action="?/logPast" class="stack">
					<label>
						<span>Finished on</span>
						<input name="endDate" type="date" required />
					</label>
					<label>
						<span>Rating</span>
						<select name="rating">
							<option value="">Unrated</option>
							{#each [1, 2, 3, 4, 5] as n (n)}<option value={n}>{n}</option>{/each}
						</select>
					</label>
					<label class="check">
						<input name="readBefore" type="checkbox" />
						<span>I've read this before</span>
					</label>
					<button type="submit">Log past read</button>
				</form>
			</details>
		{:else if data.status === 'Reading'}
			<details class="disclosure">
				<summary>Finish</summary>
				<form method="POST" action="?/finish" class="stack">
					<label>
						<span>Finished on</span>
						<input name="endDate" type="date" />
						<small>Leave blank for today.</small>
					</label>
					<label>
						<span>Rating</span>
						<select name="rating">
							<option value="">Unrated</option>
							{#each [1, 2, 3, 4, 5] as n (n)}<option value={n}>{n}</option>{/each}
						</select>
					</label>
					<label class="check">
						<input name="readBefore" type="checkbox" />
						<span>I've read this before</span>
					</label>
					<button type="submit">Finish</button>
				</form>
			</details>

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
				<button type="submit">Back to Want to read</button>
			</form>
		{:else}
			<form method="POST" action="?/start">
				<button type="submit">Start again</button>
			</form>
		{/if}
	</section>

	<!-- Read history -->
	<section class="reads">
		<h2>Reads</h2>
		{#if data.reads.length === 0}
			<p class="muted">No Reads yet.</p>
		{:else}
			<ul>
				{#each data.reads as r (r.id)}
					<li class="read">
						<div class="read-line">
							<span class="read-outcome">{outcomeLabel(r.outcome)}</span>
							<span class="read-dates">
								{#if r.startDate}{formatDay(r.startDate)}{/if}
								{#if r.startDate && r.endDate}&ndash;{/if}
								{#if r.endDate}{formatDay(r.endDate)}{/if}
							</span>
							{#if r.rating != null}
								<span class="read-rating" title={`${r.rating} out of 5`}>{ratingStars(r.rating)}</span>
							{/if}
							{#if r.isReread}
								<span class="reread" title="Reread">↻ Reread</span>
							{/if}
						</div>

						<div class="read-tools">
							<details class="disclosure">
								<summary>Edit</summary>
								<form method="POST" action="?/editRead" class="stack">
									<input type="hidden" name="readId" value={r.id} />
									{#if r.outcome !== 'finished' || r.startDate !== null}
										<label>
											<span>Started on</span>
											<input name="startDate" type="date" value={r.startDate ?? ''} />
										</label>
									{/if}
									{#if r.outcome !== 'open'}
										<label>
											<span>Ended on</span>
											<input name="endDate" type="date" value={r.endDate ?? ''} />
										</label>
									{/if}
									<label>
										<span>Rating</span>
										<select name="rating">
											<option value="" selected={r.rating == null}>Unrated</option>
											{#each [1, 2, 3, 4, 5] as n (n)}
												<option value={n} selected={r.rating === n}>{n}</option>
											{/each}
										</select>
									</label>
									<button type="submit">Save</button>
								</form>
							</details>

							<form
								method="POST"
								action="?/deleteRead"
								onsubmit={confirmSubmit(r.deleteMessage)}
							>
								<input type="hidden" name="readId" value={r.id} />
								<button type="submit" class="link-button">Delete</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#snippet readLinkField(selected: number | null)}
		{#if data.reads.length > 0}
			<label>
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

	<!-- Quotes -->
	<section class="annotations">
		<h2>Quotes</h2>
		{#if form?.quoteError}
			<p class="error" role="alert">{form.quoteError}</p>
		{/if}

		{#if data.canAnnotate}
			<details class="disclosure">
				<summary>Add a Quote</summary>
				<form method="POST" action="?/addQuote" class="stack">
					<label>
						<span>Quote</span>
						<textarea name="text" rows="3" required></textarea>
					</label>
					<label>
						<span>Page or location (optional)</span>
						<input name="location" type="text" />
					</label>
					{@render readLinkField(data.defaultReadId)}
					<button type="submit">Add Quote</button>
				</form>
			</details>
		{:else}
			<p class="muted">Start this Book to add Quotes. Existing Quotes stay here.</p>
		{/if}

		{#if data.quotes.length === 0}
			<p class="muted">No Quotes yet.</p>
		{:else}
			<ul class="annotation-list">
				{#each data.quotes as q (q.id)}
					<li class="annotation">
						<blockquote class="quote-text">{q.text}</blockquote>
						<div class="annotation-meta">
							{#if q.location}<span>{q.location}</span>{/if}
							{#if readLabelFor(q.readId)}<span class="link">↳ {readLabelFor(q.readId)}</span>{/if}
						</div>
						<div class="read-tools">
							<details class="disclosure">
								<summary>Edit</summary>
								<form method="POST" action="?/editQuote" class="stack">
									<input type="hidden" name="quoteId" value={q.id} />
									<label>
										<span>Quote</span>
										<textarea name="text" rows="3" required>{q.text}</textarea>
									</label>
									<label>
										<span>Page or location (optional)</span>
										<input name="location" type="text" value={q.location ?? ''} />
									</label>
									{@render readLinkField(q.readId)}
									<button type="submit">Save</button>
								</form>
							</details>
							<form
								method="POST"
								action="?/deleteQuote"
								onsubmit={confirmSubmit('Delete this Quote?')}
							>
								<input type="hidden" name="quoteId" value={q.id} />
								<button type="submit" class="link-button">Delete</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Notes -->
	<section class="annotations">
		<h2>Notes</h2>
		{#if form?.noteError}
			<p class="error" role="alert">{form.noteError}</p>
		{/if}

		{#if data.canAnnotate}
			<details class="disclosure">
				<summary>Add a Note</summary>
				<form method="POST" action="?/addNote" class="stack">
					<label>
						<span>Note (Markdown)</span>
						<textarea name="body" rows="5" required></textarea>
					</label>
					{@render readLinkField(data.defaultReadId)}
					<button type="submit">Add Note</button>
				</form>
			</details>
		{:else}
			<p class="muted">Start this Book to add Notes. Existing Notes stay here.</p>
		{/if}

		{#if data.notes.length === 0}
			<p class="muted">No Notes yet.</p>
		{:else}
			<ul class="annotation-list">
				{#each data.notes as n (n.id)}
					<li class="annotation">
						<!-- Sanitised server-side in src/lib/markdown.ts (HTML-escaped by construction). -->
						<div class="note-body">{@html n.html}</div>
						<div class="annotation-meta">
							{#if readLabelFor(n.readId)}<span class="link">↳ {readLabelFor(n.readId)}</span>{/if}
						</div>
						<div class="read-tools">
							<details class="disclosure">
								<summary>Edit</summary>
								<form method="POST" action="?/editNote" class="stack">
									<input type="hidden" name="noteId" value={n.id} />
									<label>
										<span>Note (Markdown)</span>
										<textarea name="body" rows="5" required>{n.body}</textarea>
									</label>
									{@render readLinkField(n.readId)}
									<button type="submit">Save</button>
								</form>
							</details>
							<form
								method="POST"
								action="?/deleteNote"
								onsubmit={confirmSubmit('Delete this Note?')}
							>
								<input type="hidden" name="noteId" value={n.id} />
								<button type="submit" class="link-button">Delete</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Edit metadata -->
	<details class="disclosure block">
		<summary>Edit details</summary>
		<form method="POST" action="?/updateMeta" class="stack">
			{#if form?.metaError}
				<p class="error" role="alert">{form.metaError}</p>
			{/if}
			<label>
				<span>Title</span>
				<input name="title" type="text" value={book.title} required />
			</label>
			<label>
				<span>Author(s), separated by commas</span>
				<input name="authors" type="text" value={book.authors.join(', ')} />
			</label>
			<div class="row">
				<label>
					<span>ISBN</span>
					<input name="isbn" type="text" value={book.isbn ?? ''} />
				</label>
				<label>
					<span>Page count</span>
					<input name="pageCount" type="number" min="1" value={book.pageCount ?? ''} />
				</label>
			</div>
			<label>
				<span>Description</span>
				<textarea name="description" rows="4">{book.description}</textarea>
			</label>
			<label>
				<span>Why / recommended by</span>
				<input name="whyRecommended" type="text" value={book.whyRecommended ?? ''} />
			</label>
			<button type="submit">Save details</button>
		</form>

		{#if book.workId}
			<form
				method="POST"
				action="?/syncMeta"
				class="stack"
				onsubmit={confirmSubmit(
					'Replace the title, authors, description, ISBN and page count with Open Library\'s current data? "Why / recommended by" and the cover stay as they are.'
				)}
			>
				<button type="submit">Sync details from Open Library</button>
			</form>
		{/if}
	</details>

	<!-- Change cover -->
	<details class="disclosure block" open={data.editionCovers != null || Boolean(form?.coverError)}>
		<summary>Change cover</summary>

		{#if form?.coverError}
			<p class="error" role="alert">{form.coverError}</p>
		{/if}

		<form method="POST" action="?/uploadCover" enctype="multipart/form-data" class="stack">
			<label>
				<span>Upload an image (JPEG, PNG, GIF or WebP, max 5 MB)</span>
				<input name="cover" type="file" accept="image/jpeg,image/png,image/gif,image/webp" required />
			</label>
			<button type="submit">Upload cover</button>
		</form>

		{#if book.workId}
			<div class="editions">
				<p class="muted">Or pick the real cover from one of this work's editions:</p>
				{#if data.editionCovers == null}
					<a class="load-editions" href="?covers=1">Show edition covers</a>
				{:else if data.editionCovers.length === 0}
					<p class="muted">No edition covers were found.</p>
				{:else}
					<ul class="edition-covers">
						{#each data.editionCovers as edition (edition.coverUrl)}
							<li>
								<form method="POST" action="?/pickCover">
									<input type="hidden" name="coverUrl" value={edition.coverUrl} />
									<button type="submit" class="edition-cover" title={edition.label}>
										<img src={edition.coverUrl} alt={edition.label} width="80" height="120" />
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</details>

	<!-- Delete Book -->
	<form
		method="POST"
		action="?/deleteBook"
		class="danger"
		onsubmit={confirmSubmit(
			`Delete ${book.title}? Its Reads, Quotes, and Notes will be deleted too. This cannot be undone.`
		)}
	>
		<button type="submit" class="delete-book">Delete this Book</button>
	</form>
</article>

<style>
	.book {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.header {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 1.5rem;
		align-items: start;
	}
	.cover {
		width: 120px;
		height: 180px;
		object-fit: cover;
		background: #eee;
		border-radius: 3px;
	}
	.cover--none {
		border: 1px dashed #bbb;
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.meta h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.status {
		align-self: flex-start;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #1a56db;
		font-weight: 700;
	}
	.byline {
		margin: 0;
		color: #555;
	}
	.edition {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.1rem 0.75rem;
		margin: 0.3rem 0 0;
		font-size: 0.9rem;
	}
	.edition dt {
		color: #888;
	}
	.edition dd {
		margin: 0;
	}
	.why {
		margin: 0.3rem 0 0;
	}
	.description {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: flex-start;
	}
	.actions > form button {
		cursor: pointer;
	}
	.reads h2 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
	}
	.reads ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.read {
		border: 1px solid #eee;
		border-radius: 6px;
		padding: 0.6rem 0.75rem;
	}
	.read-line {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}
	.read-outcome {
		font-weight: 600;
	}
	.read-dates {
		color: #555;
	}
	.read-rating {
		color: #b8860b;
		letter-spacing: 1px;
	}
	.reread {
		color: #1a56db;
		font-weight: 600;
	}
	.read-tools {
		display: flex;
		gap: 1rem;
		align-items: baseline;
		margin-top: 0.4rem;
	}
	.disclosure summary {
		cursor: pointer;
		color: #1a56db;
	}
	.disclosure.block {
		border-top: 1px solid #eee;
		padding-top: 1rem;
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		max-width: 28rem;
		margin-top: 0.6rem;
	}
	.stack label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.stack label.check {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
	}
	.stack small {
		color: #888;
	}
	.row {
		display: flex;
		gap: 0.75rem;
	}
	.row label {
		flex: 1;
	}
	.stack button {
		align-self: flex-start;
	}
	.link-button {
		background: none;
		border: none;
		padding: 0;
		color: #b00020;
		cursor: pointer;
		text-decoration: underline;
		font: inherit;
	}
	.edition-covers {
		list-style: none;
		padding: 0;
		margin: 0.6rem 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.edition-cover {
		padding: 0;
		border: 2px solid transparent;
		background: none;
		cursor: pointer;
		border-radius: 3px;
	}
	.edition-cover:hover {
		border-color: #1a56db;
	}
	.edition-cover img {
		display: block;
		width: 80px;
		height: 120px;
		object-fit: cover;
		background: #eee;
	}
	.editions {
		margin-top: 1rem;
	}
	.annotations h2 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
	}
	.annotation-list {
		list-style: none;
		padding: 0;
		margin: 0.75rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.annotation {
		border: 1px solid #eee;
		border-radius: 6px;
		padding: 0.6rem 0.75rem;
	}
	.quote-text {
		margin: 0;
		padding-left: 0.75rem;
		border-left: 3px solid #ddd;
		white-space: pre-wrap;
		font-style: italic;
	}
	.note-body {
		line-height: 1.5;
	}
	.note-body :global(p) {
		margin: 0 0 0.5rem;
	}
	.note-body :global(:last-child) {
		margin-bottom: 0;
	}
	.note-body :global(pre) {
		background: #f5f5f5;
		padding: 0.5rem;
		border-radius: 4px;
		overflow-x: auto;
	}
	.annotation-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.4rem;
		font-size: 0.85rem;
		color: #777;
	}
	.annotation-meta .link {
		color: #1a56db;
	}
	.muted {
		color: #777;
	}
	.error {
		color: #b00020;
		margin: 0;
	}
	.danger {
		border-top: 1px solid #eee;
		padding-top: 1rem;
	}
	.delete-book {
		color: #b00020;
		border: 1px solid #b00020;
		background: none;
		border-radius: 4px;
		padding: 0.4rem 0.8rem;
		cursor: pointer;
	}
	.delete-book:hover {
		background: #b00020;
		color: #fff;
	}
</style>
