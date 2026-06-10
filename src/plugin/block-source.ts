import {
	MarkdownView,
	TFile,
	type App,
	type MarkdownPostProcessorContext,
	type MarkdownSectionInformation,
	type SectionCache,
} from 'obsidian';

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
	blockLineHint: number | null,
): Promise<string> {
	const fromSection = sectionInfo?.text
		? extractAbcCodeBlockBody(sectionInfo.text)
		: null;
	let resolved = chooseBestAbcSource(processorSource, fromSection);

	const abstractFile = app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(abstractFile instanceof TFile)) {
		return normalizeAbcBlockBody(resolved);
	}

	const markdown = await readNoteMarkdown(app, abstractFile, ctx.sourcePath);
	const lineHint = blockLineHint ?? sectionInfo?.lineStart ?? null;

	// Fence scan of the live note is the most reliable source in Live Preview.
	const fromScan = extractAbcBlockFromNote(markdown, lineHint);
	resolved = chooseBestAbcSource(resolved, fromScan);

	const cache = app.metadataCache.getFileCache(abstractFile);
	const fromCache =
		cache?.sections !== undefined
			? pickAbcBodyFromSectionCache(markdown, cache.sections, lineHint)
			: null;
	resolved = chooseBestAbcSource(resolved, fromCache);

	return normalizeAbcBlockBody(resolved);
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

		let nearest = 0;
		let nearestDistance = Number.POSITIVE_INFINITY;
		for (let i = 0; i < abcSections.length; i++) {
			const section = abcSections[i];
			if (!section) continue;
			const distance = Math.abs(section.position.start.line - lineHint);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearest = i;
			}
		}
		return bodies[nearest] ?? null;
	}

	return bodies[0] ?? null;
}

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

async function readNoteMarkdown(
	app: App,
	file: TFile,
	sourcePath: string,
): Promise<string> {
	const active = app.workspace.activeEditor;
	if (active?.file?.path === sourcePath && active.editor) {
		return active.editor.getValue();
	}

	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (activeView?.file?.path === sourcePath) {
		return activeView.data;
	}

	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === sourcePath) {
			return view.data;
		}
	}

	return app.vault.cachedRead(file);
}

function extractAbcCodeBlockBody(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	if (!trimmed.includes('```')) {
		return normalizeAbcBlockBody(trimmed);
	}

	return extractAllAbcBlockBodies(trimmed)[0] ?? null;
}

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
