/**
 * Full-text search across a reader's Quotes and Notes (apostillas-v1/08).
 *
 * The searchable text of every Quote and Note lives in a single FTS5 index
 * (`annotations_fts`), kept in sync by SQL triggers (see the 0003 migration) so
 * creating, editing or deleting a Quote or Note — including when a deleted Book
 * cascades them away — updates the index automatically. This module only reads
 * from it: it turns a reader's query into a safe FTS5 MATCH expression and
 * returns ranked hits ready for the Search screen.
 */

import { sql } from 'drizzle-orm';
import type { Db } from './books';

/** One search hit: the matching Quote or Note, its Book, and a marked snippet. */
export interface SearchHit {
	kind: 'quote' | 'note';
	/** Row id of the Quote or Note within its own table. */
	refId: number;
	bookId: number;
	bookTitle: string;
	bookAuthors: string[];
	/**
	 * The matching excerpt, HTML-escaped with `<mark>…</mark>` around the terms.
	 * Built from escaped text, so it is safe to render with `{@html}`.
	 */
	snippetHtml: string;
}

// Sentinels snippet() wraps matches in. They are control characters that never
// occur in stored text, so we can HTML-escape the excerpt first and only then
// turn these into real <mark> tags — no stored markup can slip through.
const OPEN = '\u0002';
const CLOSE = '\u0003';

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Turn a reader's free-text query into an FTS5 MATCH expression, or null when
 * there is nothing to search for. Each word becomes a quoted prefix term so
 * punctuation and FTS5 operators in the input can never be misread as syntax;
 * terms are ANDed, so every word must appear.
 */
export function toMatchQuery(query: string): string | null {
	const terms = query
		.split(/\s+/)
		.filter((t) => /[\p{L}\p{N}]/u.test(t))
		.map((t) => `"${t.replace(/"/g, '""')}"*`);
	return terms.length > 0 ? terms.join(' ') : null;
}

interface HitRow {
	kind: 'quote' | 'note';
	ref_id: number;
	book_id: number;
	title: string;
	authors: string;
	snippet: string;
}

function parseAuthors(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed.filter((a): a is string => typeof a === 'string') : [];
	} catch {
		return [];
	}
}

/**
 * Search every Quote and Note for `query`, most relevant first. Returns an empty
 * list when the query has no searchable words.
 */
export function searchAnnotations(db: Db, query: string): SearchHit[] {
	const match = toMatchQuery(query);
	if (match === null) return [];

	const rows = db.all<HitRow>(sql`
		SELECT
			f.kind AS kind,
			f.ref_id AS ref_id,
			f.book_id AS book_id,
			b.title AS title,
			b.authors AS authors,
			snippet(annotations_fts, 0, ${OPEN}, ${CLOSE}, '…', 12) AS snippet
		FROM annotations_fts f
		JOIN books b ON b.id = f.book_id
		WHERE annotations_fts MATCH ${match}
		ORDER BY rank
	`);

	return rows.map((r) => ({
		kind: r.kind,
		refId: r.ref_id,
		bookId: r.book_id,
		bookTitle: r.title,
		bookAuthors: parseAuthors(r.authors),
		snippetHtml: escapeHtml(r.snippet).split(OPEN).join('<mark>').split(CLOSE).join('</mark>')
	}));
}
