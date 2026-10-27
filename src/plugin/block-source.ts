import {
	MarkdownView,
	TFile,
	type App,
	type MarkdownPostProcessorContext,
	type MarkdownSectionInformation,
	type SectionCache,
} from 'obsidian';
import { extractAbcBlockBodyAtOpenLine } from '../editor/abc-block-patch';

/** Parsed content state for an ```abc fence body (Phase 1.5). */
export type AbcBlockContentState = 'empty' | 'has-content';

const ABC_FENCE_OPEN = /^```abc\b/i;
const FENCE_CLOSE = /^```\s*$/;

/**
 * True when the fence body is empty or whitespace-only (spaces, tabs, newlines).
 * Phase 2.3 adds the staff shell for empty blocks; Phase 4.3 writes ABC on first edit.
 */
export function isEmptyAbcBlockSource(source: string): boolean {
	return normalizeAbcBlockBody(source).length === 0;
}

/** Classify a fence as empty or filled, used to pick the staff shell versus a rendered score. */
export function getAbcBlockContentState(source: string): AbcBlockContentState {
	return isEmptyAbcBlockSource(source) ? 'empty' : 'has-content';
}

/** True when ABC includes at least one plausible music line (note letters or rests). */
export function abcHasMusicLines(abc: string): boolean {
	for (const line of normalizeAbcBlockBody(abc).split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('%')) continue;
		if (/^[A-Za-z]:/.test(trimmed)) continue;
		if (/[A-Ga-gzZ]|\||::/.test(trimmed)) return true;
	}
	return false;
}

/**
 * Strip fence markers, BOM, interior blank lines, and normalize line endings.
 * Blank lines between ABC headers break abcjs (headers-only SVG); remove them here.
 */
export function normalizeAbcBlockBody(abc: string): string {
	const lines = abc
		.replace(/^\uFEFF/, '')
		.replace(/[\u200B-\u200D]/g, '')
		.replace(/\r\n/g, '\n')
		.split('\n');
	const cleaned: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || ABC_FENCE_OPEN.test(trimmed) || FENCE_CLOSE.test(trimmed)) {
			continue;
		}
		cleaned.push(line);
	}

	return cleaned.join('\n').trim();
}

/**
 * Resolve ABC text for rendering. Live Preview often passes header-only `source`;
 * always prefer the full ```abc fence from the open editor buffer when available.
 */
export async function resolveAbcBlockSourceAsync(
	app: App,
	ctx: MarkdownPostProcessorContext,
	processorSource: string,
	sectionInfo: MarkdownSectionInformation | null,
	blockOpenLine: number | null,
	blockIndex: number | null = null,
	containingElement?: HTMLElement,
): Promise<string> {
	const abstractFile = app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(abstractFile instanceof TFile)) {
		const fromSection = sectionInfo?.text
			? extractAbcCodeBlockBody(sectionInfo.text)
			: null;
		return normalizeAbcBlockBody(
			chooseBestAbcSource(processorSource, fromSection),
		);
	}

	const markdown = await readNoteMarkdown(
		app,
		abstractFile,
		ctx.sourcePath,
		containingElement,
	);

	// When the fence is identified, read only that block — never merge in another
	// block's ABC (chooseBestAbcSource prefers music lines and breaks multi-block).
	if (blockIndex !== null) {
		const fromIndex = readAbcBodyAtBlockIndex(markdown, blockIndex);
		if (fromIndex !== null) {
			return fromIndex;
		}
	}

	if (blockOpenLine !== null) {
		return readAbcBodyAtFenceLine(markdown, blockOpenLine, processorSource);
	}

	// Multi-block note before DOM identity is known — never merge siblings.
	if (extractAllAbcBlockBodies(markdown).length > 1) {
		return normalizeAbcBlockBody(processorSource);
	}

	const fromSection = sectionInfo?.text
		? extractAbcCodeBlockBody(sectionInfo.text)
		: null;
	let resolved = chooseBestAbcSource(processorSource, fromSection);

	const fromScan = extractAbcBlockFromNote(markdown, blockOpenLine);
	resolved = chooseBestAbcSource(resolved, fromScan);

	const cache = app.metadataCache.getFileCache(abstractFile);
	const fromCache =
		cache?.sections !== undefined
			? pickAbcBodyFromSectionCache(markdown, cache.sections, blockOpenLine)
			: null;
	resolved = chooseBestAbcSource(resolved, fromCache);

	return normalizeAbcBlockBody(resolved);
}

/** Read the Nth ```abc fence body in document order (0-based index). */
export function readAbcBodyAtBlockIndex(
	markdown: string,
	blockIndex: number,
): string | null {
	const bodies = extractAllAbcBlockBodies(markdown);
	const body = bodies[blockIndex];
	return body !== undefined ? normalizeAbcBlockBody(body) : null;
}

/**
 * Read one fence body by its opening line. When the line hint is stale after
 * manual Source edits, return the processor fallback only — never scan siblings.
 */
export function readAbcBodyAtFenceLine(
	markdown: string,
	blockOpenLine: number,
	processorFallback: string,
): string {
	const body = extractAbcBlockBodyAtOpenLine(markdown, blockOpenLine);
	if (body !== null) {
		return normalizeAbcBlockBody(body);
	}
	return normalizeAbcBlockBody(processorFallback);
}

/** Extract every ```abc fence body from markdown (opening/closing fences excluded). */
export function extractAllAbcBlockBodies(markdown: string): string[] {
	const bodies: string[] = [];
	const lines = markdown.split(/\r?\n/);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (!ABC_FENCE_OPEN.test(line.trim())) {
			continue;
		}

		i++;
		const bodyLines: string[] = [];
		while (i < lines.length) {
			const bodyLine = lines[i] ?? '';
			if (FENCE_CLOSE.test(bodyLine.trim())) {
				bodies.push(normalizeAbcBlockBody(bodyLines.join('\n')));
				break;
			}
			bodyLines.push(bodyLine);
			i++;
		}
	}

	return bodies;
}

/** Pull one ```abc body from Obsidian's section cache when the processor source is incomplete. */
function pickAbcBodyFromSectionCache(
	markdown: string,
	sections: SectionCache[],
	lineHint: number | null,
): string | null {
	const lines = markdown.split(/\r?\n/);
	const abcSections = sections.filter((section) => {
		if (section.type !== 'code') return false;
		const opening = lines[section.position.start.line] ?? '';
		return ABC_FENCE_OPEN.test(opening.trim());
	});

	if (abcSections.length === 0) {
		return null;
	}

	const bodies = abcSections.map((section) => {
		const openLine = section.position.start.line;
		let closeLine = section.position.end.line;
		const closeText = (lines[closeLine] ?? '').trim();
		if (!FENCE_CLOSE.test(closeText) && FENCE_CLOSE.test((lines[closeLine - 1] ?? '').trim())) {
			closeLine -= 1;
		}
		return normalizeAbcBlockBody(lines.slice(openLine + 1, closeLine).join('\n'));
	});

	if (bodies.length === 1) {
		return bodies[0] ?? null;
	}

	if (lineHint !== null) {
		const idx = abcSections.findIndex(
			(section) => section.position.start.line === lineHint,
		);
		if (idx >= 0) {
			return bodies[idx] ?? null;
		}

		return null;
	}

	return bodies[0] ?? null;
}

/** Read a fence body from the full note, using a line hint when several fences exist. */
function extractAbcBlockFromNote(
	markdown: string,
	lineHint: number | null,
): string | null {
	const bodies = extractAllAbcBlockBodies(markdown);
	if (bodies.length === 0) {
		return null;
	}
	if (bodies.length === 1) {
		return bodies[0] ?? null;
	}

	const index =
		lineHint !== null ? abcBlockIndexAtLine(markdown, lineHint) : 0;
	return bodies[index] ?? bodies[0] ?? null;
}

/** Count ```abc opening fences up to a line to get that block's index. */
function abcBlockIndexAtLine(markdown: string, lineStart: number): number {
	const lines = markdown.split(/\r?\n/);
	let index = -1;

	for (let i = 0; i <= lineStart && i < lines.length; i++) {
		if (ABC_FENCE_OPEN.test((lines[i] ?? '').trim())) {
			index++;
		}
	}

	return Math.max(0, index);
}

/** Prefer the CodeMirror embed as the anchor so the right pane is found when a note is open twice. */
function containingAnchorForMarkdownView(element: HTMLElement): HTMLElement {
	const embed = element.closest('.cm-embed-block');
	if (embed instanceof HTMLElement) {
		return embed;
	}
	return element;
}

/** MarkdownView leaf that contains `element` (correct pane when one note is open in multiple windows). */
export function findMarkdownViewContaining(
	app: App,
	sourcePath: string,
	element: HTMLElement,
): MarkdownView | null {
	const anchor = containingAnchorForMarkdownView(element);
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (
			view instanceof MarkdownView &&
			view.file?.path === sourcePath &&
			view.contentEl.contains(anchor)
		) {
			return view;
		}
	}

	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	return activeView?.file?.path === sourcePath ? activeView : null;
}

/** Live buffer when an editor exists; otherwise the view's last-known data. */
export function getMarkdownFromView(view: MarkdownView): string {
	if (view.editor) {
		return view.editor.getValue();
	}
	return view.data;
}

/** Current markdown for this note, preferring the open editor over the last saved file. */
export async function readNoteMarkdown(
	app: App,
	file: TFile,
	sourcePath: string,
	containingElement?: HTMLElement,
): Promise<string> {
	if (containingElement) {
		const view = findMarkdownViewContaining(app, sourcePath, containingElement);
		if (view) {
			return getMarkdownFromView(view);
		}
	}

	const active = app.workspace.activeEditor;
	if (active?.file?.path === sourcePath && active.editor) {
		return active.editor.getValue();
	}

	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (activeView?.file?.path === sourcePath) {
		return getMarkdownFromView(activeView);
	}

	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === sourcePath) {
			return getMarkdownFromView(view);
		}
	}

	return app.vault.cachedRead(file);
}

/** Body of the first ```abc fence in a section snippet, or the snippet itself when fences are already stripped. */
function extractAbcCodeBlockBody(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	if (!trimmed.includes('```')) {
		return normalizeAbcBlockBody(trimmed);
	}

	return extractAllAbcBlockBodies(trimmed)[0] ?? null;
}

/** Prefer whichever ABC candidate actually contains music, then the longer one. */
function chooseBestAbcSource(processor: string, alternate: string | null): string {
	if (!alternate) return processor;

	const a = normalizeAbcBlockBody(processor);
	const b = normalizeAbcBlockBody(alternate);
	if (!a) return b;
	if (!b) return a;

	const aHasMusic = abcHasMusicLines(a);
	const bHasMusic = abcHasMusicLines(b);
	if (bHasMusic && !aHasMusic) return b;
	if (aHasMusic && !bHasMusic) return a;

	return b.length > a.length ? b : a;
}
