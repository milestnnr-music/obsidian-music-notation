import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { resolveAbcBlockSourceAsync } from './block-source';
import { renderLivePreview } from './render-live-preview';
import { renderReadingView } from './render-reading';
import { detectAbcBlockViewMode } from './view-mode';

/** Fenced-code language tag for music blocks (` ```abc `). */
export const ABC_BLOCK_LANGUAGE = 'abc';

const PROCESSOR_GENERATION = 'data-abc-processor-generation';

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
		(source, el, ctx) => {
			void handleAbcCodeBlock(plugin, source, el, ctx);
		},
	);
}

async function handleAbcCodeBlock(
	plugin: Plugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): Promise<void> {
	const generation = String(Number(el.getAttribute(PROCESSOR_GENERATION) ?? '0') + 1);
	el.setAttribute(PROCESSOR_GENERATION, generation);

	const sectionInfo = ctx.getSectionInfo(el);
	const blockLineHint = sectionInfo?.lineStart ?? null;
	const abcSource = await resolveAbcBlockSourceAsync(
		plugin.app,
		ctx,
		source,
		sectionInfo,
		blockLineHint,
	);

	if (el.getAttribute(PROCESSOR_GENERATION) !== generation) {
		return;
	}

	el.empty();

	const root = el.createDiv({ cls: 'abc-blocks-root' });
	const viewMode = detectAbcBlockViewMode(plugin.app, el);

	if (viewMode === 'live-preview') {
		renderLivePreview(root, abcSource, source, ctx, plugin.app, blockLineHint);
	} else {
		renderReadingView(root, abcSource);
	}
}
