<!--
	The fields of an Impression form (GLOSSARY.md): a required date (today by
	default), an optional rating, an optional short review, and the Reread and
	Didn't finish tick boxes. The surrounding <form> supplies the action and
	buttons, so the Book page and My Reading can share this.
-->
<script lang="ts">
	import { MAX_REVIEW, type Impression } from '#lib/domain/impressions';
	import StarInput from './StarInput.svelte';

	let {
		value = null,
		today
	}: {
		/** The Impression being edited, or null for a new one. */
		value?: Omit<Impression, 'id'> | null;
		/** Today as `YYYY-MM-DD`, the default date of a new Impression. */
		today: string;
	} = $props();

	const uid = $props.id();
	// svelte-ignore state_referenced_locally
	let review = $state(value?.review ?? '');
</script>

<div class="impression-fields stack">
	<div class="top">
		<label class="field">
			<span>Date</span>
			<input name="date" type="date" required value={value?.date ?? today} max="9999-12-31" />
		</label>
		<div class="field">
			<span>Rating (optional)</span>
			<StarInput value={value?.rating ?? null} />
		</div>
	</div>
	<label class="field">
		<span>Short review (optional)</span>
		<textarea
			name="review"
			rows="3"
			maxlength={MAX_REVIEW}
			bind:value={review}
			aria-describedby={`${uid}-count`}
		></textarea>
		<small id={`${uid}-count`} class="count" class:near={review.length > MAX_REVIEW * 0.9}
			>{review.length} / {MAX_REVIEW}</small
		>
	</label>
	<div class="checks">
		<label class="check">
			<input name="reread" type="checkbox" checked={value?.reread ?? false} />
			<span>↻ Reread</span>
		</label>
		<label class="check">
			<input name="didNotFinish" type="checkbox" checked={value?.didNotFinish ?? false} />
			<span>⊘ Didn't finish</span>
		</label>
	</div>
</div>

<style>
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1.5rem;
	}
	.top input[type='date'] {
		width: auto;
	}
	textarea {
		resize: vertical;
	}
	.count {
		align-self: flex-end;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
	}
	.count.near {
		color: var(--accent);
	}
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
	}
</style>
