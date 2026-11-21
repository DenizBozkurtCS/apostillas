/**
 * Pure domain module for Reads and the derived Reading Status.
 *
 * See GLOSSARY.md for the vocabulary (Book, Read, Reread, Reading Status) and
 * docs/adr/0005-reading-status-derived-from-reads.md for the rules. Reading
 * Status and Reread are always derived from a Book's Reads, never stored.
 *
 * This module is pure: it never touches the database. Operation functions
 * return a {@link Mutation} describing the change for the persistence layer to
 * apply, so the rules live in one tested place.
 */

/** How a Read ended. An `open` Read is one in progress. */
export type Outcome = 'open' | 'finished' | 'abandoned';

/** Where a Book stands for the reader. Derived from its Reads (ADR-0005). */
export type ReadingStatus = 'Want to read' | 'Reading' | 'Finished' | 'Abandoned';

/** One pass through a Book. Dates are ISO day strings (`YYYY-MM-DD`) or null. */
export interface Read {
	/** Stable identity; also the creation-order tiebreaker (autoincrement). */
	id: number;
	/** Null for a logged past Read with no recorded start. */
	startDate: string | null;
	/** Set when the Read is finished or abandoned, or on a logged past Read. */
	endDate: string | null;
	outcome: Outcome;
	/** ½ to 5 in half-star steps, or null. */
	rating: number | null;
	/** The reader ticked "I've read this before". */
	readBefore: boolean;
}

/** A Read to insert; the database assigns the id. */
export type NewRead = Omit<Read, 'id'>;

/** Fields changed when finishing, abandoning, or editing a Read. */
export interface ReadPatch {
	outcome?: Outcome;
	startDate?: string | null;
	endDate?: string | null;
	rating?: number | null;
	readBefore?: boolean;
}

/**
 * A persistence instruction produced by an operation.
 *
 * `delete` means: delete the Read row, then unlink (set the Read to null on)
 * the Quotes and Notes whose Read is `unlinkReadId` — they stay on the Book.
 */
export type Mutation =
	| { kind: 'insert'; read: NewRead }
	| { kind: 'update'; id: number; patch: ReadPatch }
	| { kind: 'delete'; id: number; unlinkReadId: number };

/** The result of an operation: a mutation to apply, or a refusal reason. */
export type OpResult = { ok: true; mutation: Mutation } | { ok: false; error: string };

/** Optional outcome details when finishing or abandoning a Read. */
export interface CloseOptions {
	/** End date to record; defaults to today when omitted. */
	endDate?: string;
	rating?: number | null;
	readBefore?: boolean;
}

/** Fields the reader can edit on an existing Read. */
export interface EditReadFields {
	startDate?: string | null;
	endDate?: string | null;
	rating?: number | null;
}

/** The single open Read, or null when the Book is not currently being read. */
export function openRead(reads: readonly Read[]): Read | null {
	return reads.find((r) => r.outcome === 'open') ?? null;
}

/**
 * Reading Status by ADR-0005 precedence: any open Read wins (Reading), else any
 * Finished Read (Finished), else any Abandoned Read (Abandoned), else Want to
 * read. Having finished it once outranks a later abandoned reread.
 */
export function readingStatus(reads: readonly Read[]): ReadingStatus {
	if (reads.some((r) => r.outcome === 'open')) return 'Reading';
	if (reads.some((r) => r.outcome === 'finished')) return 'Finished';
	if (reads.some((r) => r.outcome === 'abandoned')) return 'Abandoned';
	return 'Want to read';
}

/** Quotes and Notes can be added to any Book except one that is Want to read. */
export function canAnnotate(status: ReadingStatus): boolean {
	return status !== 'Want to read';
}

/** Where a Read sits in time: its start, or its end for a logged past Read. */
function anchor(read: Read): string | null {
	return read.startDate ?? read.endDate;
}

/** A Finished Read whose finish date is unknown. */
function isUndatedFinished(read: Read): boolean {
	return read.outcome === 'finished' && read.endDate === null;
}

/**
 * Whether `other` is a Finished Read strictly earlier than `read`. A Finished
 * Read with no finish date (its date was removed) counts as read long ago:
 * earlier than every dated Read, as on the Finished list. Two undated Reads go
 * by creation order.
 */
function isEarlierFinished(other: Read, read: Read): boolean {
	if (other.outcome !== 'finished') return false;
	const o = other.endDate;
	const a = isUndatedFinished(read) ? null : anchor(read);
	if (o === null && a === null) return other.id < read.id;
	if (o === null) return true;
	if (a === null) return false;
	if (o < a) return true;
	if (o === a) return other.id < read.id;
	return false;
}

/**
 * A Read is a Reread when the reader ticked "I've read this before", or the
 * Book has an earlier Finished Read. Ordering is by date (start, or end for a
 * logged past Read), ties broken by creation order — so logging an older Read
 * makes later Reads Rereads retroactively. An earlier Abandoned Read alone does
 * not count.
 */
export function isReread(read: Read, reads: readonly Read[]): boolean {
	if (read.readBefore) return true;
	return reads.some((o) => o.id !== read.id && isEarlierFinished(o, read));
}

/**
 * The Reading Status the Book would have if `read` were deleted. Lets the UI
 * warn when deleting a Read would change the status (e.g. drop to Want to read).
 */
export function statusAfterDeleting(read: Read, reads: readonly Read[]): ReadingStatus {
	return readingStatus(reads.filter((r) => r.id !== read.id));
}

/** A rating is ½ to 5 stars in half-star steps. */
export function isValidRating(rating: number): boolean {
	return Number.isInteger(rating * 2) && rating >= 0.5 && rating <= 5;
}

function ratingError(rating: number | null | undefined): string | null {
	if (rating == null) return null;
	if (!isValidRating(rating)) return 'Rating must be from ½ to 5 stars, in half-star steps.';
	return null;
}

/**
 * Start a Read (start date = today), opening the Book. Refused when a Read is
 * already open; resuming an Abandoned Book opens a fresh Read.
 */
export function start(reads: readonly Read[], today: string): OpResult {
	if (openRead(reads)) {
		return {
			ok: false,
			error: 'This Book already has an open Read. Finish, abandon, or go back to Bookstack first.'
		};
	}
	return {
		ok: true,
		mutation: {
			kind: 'insert',
			read: { startDate: today, endDate: null, outcome: 'open', rating: null, readBefore: false }
		}
	};
}

function close(
	reads: readonly Read[],
	today: string,
	outcome: 'finished' | 'abandoned',
	opts: CloseOptions
): OpResult {
	const open = openRead(reads);
	if (!open) {
		const verb = outcome === 'finished' ? 'finish' : 'abandon';
		return { ok: false, error: `Nothing to ${verb}: the Book has no open Read.` };
	}
	const rErr = ratingError(opts.rating);
	if (rErr) return { ok: false, error: rErr };
	return {
		ok: true,
		mutation: {
			kind: 'update',
			id: open.id,
			patch: {
				outcome,
				endDate: opts.endDate ?? today,
				rating: opts.rating ?? null,
				readBefore: opts.readBefore ?? open.readBefore
			}
		}
	};
}

/** Finish the open Read with today's end date. Refused when no Read is open. */
export function finish(reads: readonly Read[], today: string, opts: CloseOptions = {}): OpResult {
	return close(reads, today, 'finished', opts);
}

/** Abandon the open Read with today's end date. Refused when no Read is open. */
export function abandon(reads: readonly Read[], today: string, opts: CloseOptions = {}): OpResult {
	return close(reads, today, 'abandoned', opts);
}

/**
 * Log a past Read directly as Finished, with an end date and no start date.
 * Always allowed; it records reading that happened before the Book was tracked
 * or outside the current open Read.
 */
export function logPastFinished(
	reads: readonly Read[],
	opts: { endDate: string; rating?: number | null; readBefore?: boolean }
): OpResult {
	const rErr = ratingError(opts.rating);
	if (rErr) return { ok: false, error: rErr };
	return {
		ok: true,
		mutation: {
			kind: 'insert',
			read: {
				startDate: null,
				endDate: opts.endDate,
				outcome: 'finished',
				rating: opts.rating ?? null,
				readBefore: opts.readBefore ?? false
			}
		}
	};
}

/**
 * Move a Reading Book back to Want to read by deleting its open Read. Quotes
 * and Notes linked to that Read are unlinked, not deleted — they stay on the
 * Book. Refused unless the Book is currently Reading.
 */
export function revertToWantToRead(reads: readonly Read[]): OpResult {
	const open = openRead(reads);
	if (!open) {
		return { ok: false, error: 'Only a Book that is Reading can go back to Bookstack.' };
	}
	return { ok: true, mutation: { kind: 'delete', id: open.id, unlinkReadId: open.id } };
}

/**
 * Edit a Read's dates and rating. Only the fields present in `fields` change;
 * the resulting start and end dates must not be out of order. Refused for an
 * out-of-range rating or an end date earlier than the start date.
 */
export function editRead(read: Read, fields: EditReadFields): OpResult {
	const rErr = ratingError(fields.rating);
	if (rErr) return { ok: false, error: rErr };

	const patch: ReadPatch = {};
	if ('startDate' in fields) patch.startDate = fields.startDate ?? null;
	if ('endDate' in fields) patch.endDate = fields.endDate ?? null;
	if ('rating' in fields) patch.rating = fields.rating ?? null;

	const startDate = 'startDate' in fields ? (fields.startDate ?? null) : read.startDate;
	const endDate = 'endDate' in fields ? (fields.endDate ?? null) : read.endDate;
	if (startDate !== null && endDate !== null && endDate < startDate) {
		return { ok: false, error: 'The end date cannot be before the start date.' };
	}

	return { ok: true, mutation: { kind: 'update', id: read.id, patch } };
}

/**
 * Delete a Read. Its linked Quotes and Notes are unlinked, not deleted — they
 * stay on the Book. Deleting a Read can change the Book's Reading Status; see
 * {@link statusAfterDeleting}.
 */
export function deleteRead(read: Read): Mutation {
	return { kind: 'delete', id: read.id, unlinkReadId: read.id };
}
