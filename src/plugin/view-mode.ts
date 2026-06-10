import { App, MarkdownView } from 'obsidian';

/** Where an ```abc block is being rendered in Obsidian. */
export type AbcBlockViewMode = 'reading' | 'live-preview';

/**
 * Detect Reading view vs Live Preview.
 *
 * Live Preview embeds rendered code blocks under CodeMirror — not reliably under
 * `.markdown-source-view`. Reading view uses `.markdown-reading-view`, or the
 * markdown leaf's `currentMode` is its dedicated preview sub-view.
 *
 * Source mode does not invoke code block processors — the fence stays raw
 * CodeMirror text (Obsidian default). No detection branch is needed there.
 */
export function detectAbcBlockViewMode(app: App, el: HTMLElement): AbcBlockViewMode {
	if (el.closest('.markdown-reading-view')) {
		return 'reading';
	}

	const markdownView = findMarkdownViewContaining(app, el);
	if (markdownView && markdownView.currentMode === markdownView.previewMode) {
		return 'reading';
	}

	return 'live-preview';
}

function findMarkdownViewContaining(app: App, el: HTMLElement): MarkdownView | null {
	let found: MarkdownView | null = null;

	app.workspace.iterateAllLeaves((leaf) => {
		if (found) {
			return;
		}

		const { view } = leaf;
		if (view instanceof MarkdownView && view.containerEl.contains(el)) {
			found = view;
		}
	});

	return found ?? app.workspace.getActiveViewOfType(MarkdownView);
}
