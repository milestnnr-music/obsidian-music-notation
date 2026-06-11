import { MarkdownPostProcessorContext, Plugin, TFile } from 'obsidian';
import {
	findAllAbcBlockFenceOpenLines,
	openLineForAbcBlockIndex,
	resolveAbcBlockOpenLine,
} from '../editor/abc-block-patch';
import {
	claimAbcBlockRenderOrdinal,
	getAmbiguousSectionLineStarts,
	noteAbcBlockSectionLineStart,
} from './block-ordinal';
import {
	readPersistedBlockIndex,
	writePersistedBlockIdentity,
} from './block-identity';
import {
	isPreviewAbcMappingUnreliable,
	resolveBlockOpenLineFromPreviewDom,
} from './block-dom';
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
	const persistedIndex = readPersistedBlockIndex(el);
	const viewMode = detectAbcBlockViewMode(plugin.app, el);

	const abstractFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	let markdown = '';
	if (abstractFile instanceof TFile) {
		markdown = await readNoteMarkdown(plugin.app, abstractFile, ctx.sourcePath);
	}

	let blockOpenLine: number | null = sectionInfo?.lineStart ?? null;
	let blockIndex: number | null = null;

	const fromDom =
		viewMode === 'live-preview'
			? await resolveBlockOpenLineFromPreviewDom(plugin.app, el, ctx.sourcePath)
			: null;

	if (fromDom !== null) {
		blockOpenLine = fromDom.openLine;
		blockIndex = fromDom.blockIndex;
	} else if (persistedIndex !== null && markdown.length > 0) {
		blockIndex = persistedIndex;
		blockOpenLine = openLineForAbcBlockIndex(markdown, persistedIndex);
	} else if (abstractFile instanceof TFile) {
		blockOpenLine = resolveAbcBlockOpenLine(
			markdown,
			sectionInfo,
			source,
			renderOrdinal,
			getAmbiguousSectionLineStarts(ctx.sourcePath),
		);
		const openLines = findAllAbcBlockFenceOpenLines(markdown);
		if (blockOpenLine !== null) {
			const derivedIndex = openLines.indexOf(blockOpenLine);
			blockIndex = derivedIndex >= 0 ? derivedIndex : null;
		}
	}

	if (
		viewMode === 'live-preview' &&
		fromDom === null &&
		persistedIndex !== null &&
		blockIndex === persistedIndex &&
		el.querySelector('.abc-blocks-live-preview') !== null &&
		(await isPreviewAbcMappingUnreliable(plugin.app, el, ctx.sourcePath))
	) {
		if (blockIndex !== null && blockOpenLine !== null) {
			writePersistedBlockIdentity(el, blockIndex, blockOpenLine);
		}
		return;
	}

	if (blockIndex !== null && blockOpenLine !== null) {
		writePersistedBlockIdentity(el, blockIndex, blockOpenLine);
	}

	const abcSource = await resolveAbcBlockSourceAsync(
		plugin.app,
		ctx,
		source,
		sectionInfo,
		blockOpenLine,
		blockIndex,
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
			blockIndex,
		);
	} else {
		renderReadingView(root, abcSource);
	}
}
