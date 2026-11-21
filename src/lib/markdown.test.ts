import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('wraps plain text in a paragraph', () => {
		expect(renderMarkdown('Hello world')).toBe('<p>Hello world</p>');
	});

	it('returns empty string for blank input', () => {
		expect(renderMarkdown('')).toBe('');
		expect(renderMarkdown('   \n  ')).toBe('');
	});

	it('separates paragraphs on blank lines and keeps single breaks', () => {
		expect(renderMarkdown('one\ntwo\n\nthree')).toBe('<p>one<br>two</p>\n<p>three</p>');
	});

	it('renders headings', () => {
		expect(renderMarkdown('# Title')).toBe('<h1>Title</h1>');
		expect(renderMarkdown('### Small')).toBe('<h3>Small</h3>');
	});

	it('renders bold, italic and inline code', () => {
		expect(renderMarkdown('a **bold** b')).toBe('<p>a <strong>bold</strong> b</p>');
		expect(renderMarkdown('a *it* b')).toBe('<p>a <em>it</em> b</p>');
		expect(renderMarkdown('a _it_ b')).toBe('<p>a <em>it</em> b</p>');
		expect(renderMarkdown('a `code` b')).toBe('<p>a <code>code</code> b</p>');
	});

	it('does not format markdown inside inline code', () => {
		expect(renderMarkdown('`**not bold**`')).toBe('<p><code>**not bold**</code></p>');
	});

	it('renders unordered and ordered lists', () => {
		expect(renderMarkdown('- one\n- two')).toBe('<ul>\n<li>one</li>\n<li>two</li>\n</ul>');
		expect(renderMarkdown('1. one\n2. two')).toBe('<ol>\n<li>one</li>\n<li>two</li>\n</ol>');
	});

	it('renders blockquotes', () => {
		expect(renderMarkdown('> quoted')).toBe('<blockquote>\n<p>quoted</p>\n</blockquote>');
	});

	it('renders fenced code blocks verbatim without inline formatting', () => {
		expect(renderMarkdown('```\n**x** <b>\n```')).toBe('<pre><code>**x** &lt;b&gt;</code></pre>');
	});

	// --- Sanitisation (the security-critical part) ---

	it('escapes raw HTML tags', () => {
		expect(renderMarkdown('<script>alert(1)</script>')).toBe(
			'<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
		);
	});

	it('escapes HTML inside emphasis', () => {
		expect(renderMarkdown('**<img src=x onerror=alert(1)>**')).toBe(
			'<p><strong>&lt;img src=x onerror=alert(1)&gt;</strong></p>'
		);
	});

	it('renders safe links', () => {
		expect(renderMarkdown('[site](https://example.com)')).toBe(
			'<p><a href="https://example.com">site</a></p>'
		);
		expect(renderMarkdown('[rel](/books/1)')).toBe('<p><a href="/books/1">rel</a></p>');
	});

	it('drops dangerous link protocols, keeping the text', () => {
		expect(renderMarkdown('[x](javascript:alert)')).toBe('<p>x</p>');
		expect(renderMarkdown('[x](data:text/html,evil)')).toBe('<p>x</p>');
	});

	it('does not let a link href break out of the attribute', () => {
		const html = renderMarkdown('[x](https://e.com/"onmouseover="alert(1))');
		expect(html).not.toContain('onmouseover="alert');
		expect(html).toContain('&quot;');
	});
});
