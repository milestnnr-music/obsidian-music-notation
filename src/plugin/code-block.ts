import { MarkdownPostProcessorContext, Plugin, TFile } from 'obsidian';
import { resolveAbcBlockOpenLine } from '../editor/abc-block-patch';
import {
	claimAbcBlockRenderOrdinal,
	getAmbiguousSectionLineStarts,
	noteAbcBlockSectionLineStart,
} from './block-ordinal';
import { resolveBlockOpenLineFromPreviewDom } from './block-dom';
import { readNoteMarkdown, resolveAbcBlockSourceAsync } from './block-source';
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
			const sectionInfo = ctx.getSectionInfo(el);
			if (sectionInfo?.lineStart != null) {
				noteAbcBlockSectionLineStart(ctx.sourcePath, sectionInfo.lineStart);
			}
			const renderOrdinal = claimAbcBlockRenderOrdinal(ctx.sourcePath);
			void handleAbcCodeBlock(plugin, source, el, ctx, renderOrdinal);
		},
	);
}

async function handleAbcCodeBlock(
	plugin: Plugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	renderOrdinal: number,
): Promise<void> {
	const generation = String(Number(el.getAttribute(PROCESSOR_GENERATION) ?? '0') + 1);
	el.setAttribute(PROCESSOR_GENERATION, generation);

	const sectionInfo = ctx.getSectionInfo(el);

	const abstractFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);

	let blockOpenLine: number | null = sectionInfo?.lineStart ?? null;
	if (abstractFile instanceof TFile) {
		const markdown = await readNoteMarkdown(
			plugin.app,
			abstractFile,
			ctx.sourcePath,
		);
		blockOpenLine = resolveAbcBlockOpenLine(
			markdown,
			sectionInfo,
			source,
			renderOrdinal,
			getAmbiguousSectionLineStarts(ctx.sourcePath),
		);
	}

	const viewMode = detectAbcBlockViewMode(plugin.app, el);
	if (viewMode === 'live-preview') {
		const fromDom = await resolveBlockOpenLineFromPreviewDom(
			plugin.app,
			el,
			ctx.sourcePath,
		);
		if (fromDom !== null) {
			blockOpenLine = fromDom;
		}
	}

	const abcSource = await resolveAbcBlockSourceAsync(
		plugin.app,
		ctx,
		source,
		sectionInfo,
		blockOpenLine,
	);

	if (el.getAttribute(PROCESSOR_GENERATION) !== generation) {
		return;
	}

	el.empty();

	const root = el.createDiv({ cls: 'abc-blocks-root' });

	if (viewMode === 'live-preview') {
		renderLivePreview(
			root,
			abcSource,
			source,
			ctx,
			plugin.app,
			blockOpenLine,
		);
	} else {
		renderReadingView(root, abcSource);
	}
}
