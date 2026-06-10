import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { renderLivePreview } from './render-live-preview';
import { renderReadingView } from './render-reading';
import { detectAbcBlockViewMode } from './view-mode';

/** Fenced-code language tag for music blocks (` ```abc `). */
export const ABC_BLOCK_LANGUAGE = 'abc';

/**
 * Register the ```abc markdown code block processor.
 *
 * Phase 1.4 — Source mode: Obsidian does not call this handler while editing
 * raw markdown in Source mode. Only `registerMarkdownCodeBlockProcessor` is
 * used; no CodeMirror extensions or decorations that would overlay fences.
 */
export function registerAbcCodeBlockProcessor(plugin: Plugin): void {
	plugin.registerMarkdownCodeBlockProcessor(
		ABC_BLOCK_LANGUAGE,
		(source, el, ctx) => handleAbcCodeBlock(plugin, source, el, ctx),
	);
}

function handleAbcCodeBlock(
	plugin: Plugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): void {
	el.empty();

	const root = el.createDiv({ cls: 'abc-blocks-root' });
	const viewMode = detectAbcBlockViewMode(plugin.app, el);

	if (viewMode === 'live-preview') {
		renderLivePreview(root, source, ctx);
	} else {
		renderReadingView(root, source);
	}
}
