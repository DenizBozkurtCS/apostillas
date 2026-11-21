<!--
	The Markdown editor for Notes (apostillas-v2/02): EasyMDE over a plain
	<textarea name={name}>, so the form still submits the Markdown as before.

	- The toolbar offers only what src/lib/markdown.ts renders (headings, bold,
	  italic, lists, quote, code, link), and the preview *is* that renderer, so
	  what you preview is exactly what the saved Note will show. The renderer
	  escapes HTML first, so the preview is safe to inject.
	- Icons are inline SVG; EasyMDE's Font Awesome download is turned off, so the
	  editor makes no third-party requests.
	- Side-by-side preview opens by default when the editor is wide enough; a
	  narrow editor (phones, the Notes column) uses the Preview toggle instead.
	- EasyMDE touches the DOM when its module loads, so it is imported in the
	  browser only. Without JavaScript the plain textarea still works.
	- The textarea is not `required`: EasyMDE hides it, and a hidden required
	  field silently blocks submitting. The server rejects an empty Note.
-->
<script lang="ts">
	import 'easymde/dist/easymde.min.css';
	import { onMount } from 'svelte';
	import { renderMarkdown } from '#lib/markdown';

	let {
		name = 'body',
		value = '',
		rows = 6,
		label = 'Note (Markdown)',
		autofocus = false
	}: { name?: string; value?: string; rows?: number; label?: string; autofocus?: boolean } =
		$props();

	let textarea: HTMLTextAreaElement | undefined = $state();
	const id = $props.id();

	/** Wide enough for the editor and preview side by side. */
	const SIDE_BY_SIDE_MIN_PX = 640;

	const svg = (paths: string) =>
		`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
	const icons = {
		heading: svg('<path d="M6 4v16M18 4v16M6 12h12"/>'),
		bold: svg('<path d="M7 4h7a4 4 0 0 1 0 8H7zM7 12h8a4 4 0 0 1 0 8H7z"/>'),
		italic: svg('<path d="M19 4h-9M14 20H5M15 4L9 20"/>'),
		ul: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
		ol: svg('<path d="M10 6h10M10 12h10M10 18h10M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
		quote: svg('<path d="M3 21c3 0 7-1 7-8V5H3v7h4c0 4-1 6-4 6zM14 21c3 0 7-1 7-8V5h-7v7h4c0 4-1 6-4 6z"/>'),
		code: svg('<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>'),
		link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
		preview: svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
		sideBySide: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>')
	};

	onMount(() => {
		let editor: { toTextArea(): void; cleanup(): void; codemirror: { focus(): void } } | null =
			null;
		let cancelled = false;

		(async () => {
			const { default: EasyMDE } = await import('easymde');
			if (cancelled || !textarea) return;

			const mde = new EasyMDE({
				element: textarea,
				forceSync: true,
				autoDownloadFontAwesome: false,
				spellChecker: false,
				nativeSpellcheck: true,
				status: false,
				minHeight: `${rows * 1.5}rem`,
				sideBySideFullscreen: false,
				previewRender: (text: string) => renderMarkdown(text),
				// Markdown shortcuts kept; the rest stay as EasyMDE defaults.
				toolbar: [
					{ name: 'heading', action: EasyMDE.toggleHeadingSmaller, icon: icons.heading, title: 'Heading', className: 'md-btn' },
					{ name: 'bold', action: EasyMDE.toggleBold, icon: icons.bold, title: 'Bold', className: 'md-btn' },
					{ name: 'italic', action: EasyMDE.toggleItalic, icon: icons.italic, title: 'Italic', className: 'md-btn' },
					'|',
					{ name: 'unordered-list', action: EasyMDE.toggleUnorderedList, icon: icons.ul, title: 'Bulleted list', className: 'md-btn' },
					{ name: 'ordered-list', action: EasyMDE.toggleOrderedList, icon: icons.ol, title: 'Numbered list', className: 'md-btn' },
					{ name: 'quote', action: EasyMDE.toggleBlockquote, icon: icons.quote, title: 'Quote', className: 'md-btn' },
					{ name: 'code', action: EasyMDE.toggleCodeBlock, icon: icons.code, title: 'Code', className: 'md-btn' },
					{ name: 'link', action: EasyMDE.drawLink, icon: icons.link, title: 'Link', className: 'md-btn' },
					'|',
					{
						name: 'preview',
						action: EasyMDE.togglePreview,
						icon: icons.preview,
						title: 'Preview',
						className: 'md-btn',
						noDisable: true
					},
					{
						name: 'side-by-side',
						action: EasyMDE.toggleSideBySide,
						icon: icons.sideBySide,
						title: 'Side-by-side preview',
						noDisable: true,
						className: 'md-btn side-by-side-button'
					}
				]
			});
			editor = mde;

			const wrapper = textarea.parentElement;
			if (wrapper && wrapper.clientWidth >= SIDE_BY_SIDE_MIN_PX) EasyMDE.toggleSideBySide(mde);
			if (autofocus) mde.codemirror.focus();
		})();

		return () => {
			cancelled = true;
			if (editor) {
				editor.toTextArea();
				editor.cleanup();
			}
		};
	});
</script>

<div class="md-editor field">
	<label for={id}>{label}</label>
	<!-- svelte-ignore a11y_autofocus -->
	<textarea bind:this={textarea} {id} {name} {rows} {autofocus}>{value}</textarea>
</div>

<style>
	.md-editor > label {
		font-size: 0.85rem;
		font-weight: 550;
		color: var(--text-muted);
	}
	.md-editor {
		min-width: 0;
	}

	/* ---------- EasyMDE in the app's tokens (light and dark) ---------- */
	.md-editor :global(.EasyMDEContainer) {
		border-radius: var(--radius);
	}
	.md-editor :global(.editor-toolbar) {
		border: 1px solid var(--border-strong);
		border-bottom: none;
		border-radius: var(--radius) var(--radius) 0 0;
		background: var(--surface);
		padding: 0.25rem 0.35rem;
		opacity: 1;
	}
	.md-editor :global(.editor-toolbar button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text-muted);
	}
	.md-editor :global(.editor-toolbar button:hover),
	.md-editor :global(.editor-toolbar button.active) {
		background: var(--surface-raised);
		border-color: var(--border);
		color: var(--text);
	}
	.md-editor :global(.editor-toolbar button.active) {
		color: var(--accent);
	}
	.md-editor :global(.editor-toolbar i.separator) {
		border-left: 1px solid var(--border-strong);
		border-right: none;
		margin: 0 0.3rem;
	}
	.md-editor :global(.editor-toolbar.disabled-for-preview button:not(.no-disable)) {
		opacity: 0.35;
	}
	.md-editor :global(.CodeMirror) {
		border: 1px solid var(--border-strong);
		border-radius: 0 0 var(--radius) var(--radius);
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
		font-size: 0.95rem;
		line-height: 1.55;
	}
	.md-editor :global(.CodeMirror-focused) {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	.md-editor :global(.CodeMirror-cursor) {
		border-left-color: var(--text);
	}
	.md-editor :global(.CodeMirror-selected),
	.md-editor :global(.CodeMirror-focused .CodeMirror-selected),
	.md-editor :global(.CodeMirror-line::selection),
	.md-editor :global(.CodeMirror-line > span::selection),
	.md-editor :global(.CodeMirror-line > span > span::selection) {
		background: var(--accent-soft);
	}
	.md-editor :global(.cm-s-easymde .cm-header) {
		color: var(--text);
	}
	/* EasyMDE's heading sizes are huge for a note box; keep them modest. */
	.md-editor :global(.cm-s-easymde .cm-header-1) {
		font-size: 1.35em;
	}
	.md-editor :global(.cm-s-easymde .cm-header-2) {
		font-size: 1.2em;
	}
	.md-editor :global(.cm-s-easymde .cm-header-3),
	.md-editor :global(.cm-s-easymde .cm-header-4),
	.md-editor :global(.cm-s-easymde .cm-header-5),
	.md-editor :global(.cm-s-easymde .cm-header-6) {
		font-size: 1.05em;
	}
	.md-editor :global(.cm-s-easymde .cm-link),
	.md-editor :global(.cm-s-easymde .cm-url) {
		color: var(--accent);
	}
	.md-editor :global(.cm-s-easymde .cm-quote),
	.md-editor :global(.cm-s-easymde .cm-comment) {
		color: var(--text-muted);
		background: none;
	}
	.md-editor :global(.cm-s-easymde .cm-formatting) {
		color: var(--text-faint);
	}
	.md-editor :global(.editor-preview),
	.md-editor :global(.editor-preview-side) {
		background: var(--surface);
		color: var(--text);
		line-height: 1.6;
	}
	.md-editor :global(.editor-preview-side) {
		border: 1px solid var(--border-strong);
		border-left: none;
		border-radius: 0 0 var(--radius) 0;
	}
	.md-editor :global(.editor-preview pre),
	.md-editor :global(.editor-preview-side pre) {
		background: var(--bg);
	}
	.md-editor :global(.editor-preview blockquote),
	.md-editor :global(.editor-preview-side blockquote) {
		margin-left: 0;
		padding-left: 0.9rem;
		border-left: 3px solid var(--border-strong);
		color: var(--text-muted);
	}
	/* Side-by-side needs room; phones use the Preview toggle. */
	@media (max-width: 40rem) {
		.md-editor :global(.editor-toolbar button.side-by-side-button) {
			display: none;
		}
		.md-editor :global(.editor-toolbar button) {
			width: 1.8rem;
		}
		.md-editor :global(.editor-toolbar i.separator) {
			margin: 0 0.15rem;
		}
	}
</style>
