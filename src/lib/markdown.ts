/**
 * A small, dependency-free Markdown renderer for Notes (see GLOSSARY.md).
 *
 * The output is sanitised by construction: the source is HTML-escaped *first*,
 * so no author-supplied tag or attribute can survive, and only a fixed
 * whitelist of tags is ever emitted. Link targets are additionally restricted
 * to safe protocols. This is pure (no DOM, no database) and fully tested.
 *
 * Supported: headings, paragraphs with single-line breaks, **bold**, *italic* /
 * _italic_, `inline code`, fenced ``` code blocks, `- `/`* ` and `1. ` lists,
 * `> ` blockquotes, and [text](url) links. Anything else renders as plain text.
 */

/** Escape the four HTML-significant characters. Done before any transform. */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Return `url` only if it uses a safe protocol (http, https, mailto) or is a
 * relative/anchor reference; otherwise null. `javascript:`, `data:` and the
 * like are rejected so a link can never run script. The URL is already
 * HTML-escaped by the time it gets here, so it is safe inside an attribute.
 */
function safeUrl(url: string): string | null {
	const u = url.trim();
	if (/^(https?:|mailto:)/i.test(u)) return u;
	// Any other explicit scheme (javascript:, data:, vbscript:, …) is refused.
	if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null;
	// Relative paths, anchors and bare fragments are fine.
	return u;
}

/** Render inline Markdown on a line of already HTML-escaped text. */
function renderInline(escaped: string): string {
	// Protect inline code spans first so their contents are not reformatted.
	const codeSpans: string[] = [];
	let out = escaped.replace(/`([^`]+)`/g, (_m, code: string) => {
		codeSpans.push(`<code>${code}</code>`);
		return `\u0000${codeSpans.length - 1}\u0000`;
	});

	out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
		const safe = safeUrl(href);
		return safe === null ? text : `<a href="${safe}">${text}</a>`;
	});
	out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

	return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codeSpans[Number(i)]);
}

/** Render a run of list-item inner texts into `<li>` elements. */
function renderItems(items: string[]): string {
	return items.map((t) => `<li>${renderInline(escapeHtml(t))}</li>`).join('\n');
}

/**
 * Render Markdown `src` to sanitised HTML. Returns `''` for blank input. Blocks
 * are joined by newlines; the result contains only whitelisted tags.
 */
export function renderMarkdown(src: string): string {
	const lines = src.replace(/\r\n?/g, '\n').split('\n');
	const blocks: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Fenced code block: verbatim, escaped, no inline formatting.
		if (/^```/.test(line)) {
			const code: string[] = [];
			i++;
			while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
			if (i < lines.length) i++; // consume the closing fence
			blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
			continue;
		}

		// Blank line: block separator.
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Heading.
		const heading = /^(#{1,6})\s+(.*)$/.exec(line);
		if (heading) {
			const level = heading[1].length;
			blocks.push(`<h${level}>${renderInline(escapeHtml(heading[2].trim()))}</h${level}>`);
			i++;
			continue;
		}

		// Unordered list.
		if (/^[-*]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^[-*]\s+/, ''));
				i++;
			}
			blocks.push(`<ul>\n${renderItems(items)}\n</ul>`);
			continue;
		}

		// Ordered list.
		if (/^\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\d+\.\s+/, ''));
				i++;
			}
			blocks.push(`<ol>\n${renderItems(items)}\n</ol>`);
			continue;
		}

		// Blockquote.
		if (/^>\s?/.test(line)) {
			const inner: string[] = [];
			while (i < lines.length && /^>\s?/.test(lines[i])) {
				inner.push(lines[i].replace(/^>\s?/, ''));
				i++;
			}
			const body = inner.map((t) => renderInline(escapeHtml(t))).join('<br>');
			blocks.push(`<blockquote>\n<p>${body}</p>\n</blockquote>`);
			continue;
		}

		// Paragraph: consecutive plain lines joined by hard breaks.
		const para: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!/^```/.test(lines[i]) &&
			!/^(#{1,6})\s+/.test(lines[i]) &&
			!/^[-*]\s+/.test(lines[i]) &&
			!/^\d+\.\s+/.test(lines[i]) &&
			!/^>\s?/.test(lines[i])
		) {
			para.push(renderInline(escapeHtml(lines[i])));
			i++;
		}
		blocks.push(`<p>${para.join('<br>')}</p>`);
	}

	return blocks.join('\n');
}
