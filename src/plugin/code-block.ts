import { MarkdownPostProcessorContext, Plugin, TFile } from 'obsidian';
import {
	openLineForAbcBlockIndex,
	resolveAbcBlockIdentity,
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
	resolveLivePreviewProcessorIdentity,
} from './block-dom';
import {
	readAbcBodyAtBlockIndex,
	readNoteMarkdown,
	resolveAbcBlockSourceAsync,
} from './block-source';
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
 * raw markdown in Source mode. No CodeMirror extensions or decorations that would overlay fences.
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
			const ambiguousLineStarts = new Set(
				getAmbiguousSectionLineStarts(ctx.sourcePath),
			);
			void handleAbcCodeBlock(
				plugin,
				source,
				el,
				ctx,
				renderOrdinal,
				ambiguousLineStarts,
			);
		},
	);
}

async function handleAbcCodeBlock(
	plugin: Plugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	renderOrdinal: number,
	ambiguousLineStarts: ReadonlySet<number>,
): Promise<void> {
	const generation = String(Number(el.getAttribute(PROCESSOR_GENERATION) ?? '0') + 1);
	el.setAttribute(PROCESSOR_GENERATION, generation);

	const sectionInfo = ctx.getSectionInfo(el);
	const persistedIndex = readPersistedBlockIndex(el);
	const viewMode = detectAbcBlockViewMode(plugin.app, el);

	const abstractFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	let markdown = '';
	if (abstractFile instanceof TFile) {
		markdown = await readNoteMarkdown(plugin.app, abstractFile, ctx.sourcePath, el);
	}

	let blockOpenLine: number | null = null;
	let blockIndex: number | null = null;

	const sectionSnapshot =
		sectionInfo !== null && sectionInfo !== undefined
			? {
					text: sectionInfo.text,
					lineStart: sectionInfo.lineStart,
					lineEnd: sectionInfo.lineEnd,
				}
			: null;

	if (viewMode === 'live-preview' && markdown.length > 0) {
		const identity = await resolveLivePreviewProcessorIdentity(
			plugin.app,
			el,
			ctx.sourcePath,
			sectionSnapshot,
			source,
			renderOrdinal,
			ambiguousLineStarts,
			persistedIndex,
			markdown,
		);
		if (identity !== null) {
			blockOpenLine = identity.openLine;
			blockIndex = identity.blockIndex;
		}
	} else if (persistedIndex !== null && markdown.length > 0) {
		blockIndex = persistedIndex;
		blockOpenLine = openLineForAbcBlockIndex(markdown, persistedIndex);
	} else if (markdown.length > 0) {
		const identity = resolveAbcBlockIdentity(
			markdown,
			sectionSnapshot,
			source,
			renderOrdinal,
			ambiguousLineStarts,
		);
		if (identity !== null) {
			blockOpenLine = identity.openLine;
			blockIndex = identity.blockIndex;
		}
	}

	const existingShell = el.querySelector('.abc-blocks-live-preview');
	const mappingUnreliable =
		viewMode === 'live-preview' &&
		(await isPreviewAbcMappingUnreliable(plugin.app, el, ctx.sourcePath));

	// Sibling inline source edit hides one embed host — skip el.empty() when the shell
	// is still mounted; it refreshes by block index on editor-change. When the shell
	// was torn down for the block being edited, fall through and recreate it below.
	if (
		mappingUnreliable &&
		blockIndex !== null &&
		blockOpenLine !== null &&
		existingShell !== null
	) {
		writePersistedBlockIdentity(el, blockIndex, blockOpenLine);
		return;
	}

	if (blockIndex !== null && blockOpenLine !== null) {
		writePersistedBlockIdentity(el, blockIndex, blockOpenLine);
	}

	let abcSource: string;
	if (blockIndex !== null && markdown.length > 0) {
		const fromIndex = readAbcBodyAtBlockIndex(markdown, blockIndex);
		abcSource =
			fromIndex !== null
				? fromIndex
				: await resolveAbcBlockSourceAsync(
						plugin.app,
						ctx,
						source,
						sectionInfo,
						blockOpenLine,
						blockIndex,
						el,
					);
	} else {
		abcSource = await resolveAbcBlockSourceAsync(
			plugin.app,
			ctx,
			source,
			sectionInfo,
			blockOpenLine,
			blockIndex,
			el,
		);
	}

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
			el,
			blockOpenLine,
			blockIndex,
			sectionSnapshot,
			renderOrdinal,
			ambiguousLineStarts,
		);
	} else {
		renderReadingView(root, abcSource);
	}
}
