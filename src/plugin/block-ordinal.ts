/** Per-file render-pass state for ```abc blocks (reset after each microtask batch). */
const ordinalByFile = new Map<string, number>();
const sectionLineStartsByFile = new Map<string, number[]>();
const resetQueued = new Set<string>();

/**
 * Claim the next block ordinal for this file during a single preview render pass.
 * Processors run in document order synchronously before their async handlers resume.
 */
export function claimAbcBlockRenderOrdinal(sourcePath: string): number {
	const ordinal = ordinalByFile.get(sourcePath) ?? 0;
	ordinalByFile.set(sourcePath, ordinal + 1);
	queueRenderPassReset(sourcePath);
	return ordinal;
}

/** Record `getSectionInfo().lineStart` for duplicate detection within one pass. */
export function noteAbcBlockSectionLineStart(
	sourcePath: string,
	lineStart: number,
): void {
	const lineStarts = sectionLineStartsByFile.get(sourcePath) ?? [];
	lineStarts.push(lineStart);
	sectionLineStartsByFile.set(sourcePath, lineStarts);
}

/**
 * Line starts reported by more than one block in the same render pass.
 * Live Preview often reuses the same `lineStart` for every ```abc block.
 */
export function getAmbiguousSectionLineStarts(sourcePath: string): ReadonlySet<number> {
	const lineStarts = sectionLineStartsByFile.get(sourcePath) ?? [];
	const counts = new Map<number, number>();

	for (const line of lineStarts) {
		counts.set(line, (counts.get(line) ?? 0) + 1);
	}

	const ambiguous = new Set<number>();
	for (const [line, count] of counts) {
		if (count > 1) {
			ambiguous.add(line);
		}
	}

	return ambiguous;
}

function queueRenderPassReset(sourcePath: string): void {
	if (resetQueued.has(sourcePath)) {
		return;
	}

	resetQueued.add(sourcePath);
	// Defer past async processor continuations so ambiguous line-start detection
	// remains available for every block in the same render pass.
	deferAfterRenderPass(() => {
		ordinalByFile.delete(sourcePath);
		sectionLineStartsByFile.delete(sourcePath);
		resetQueued.delete(sourcePath);
	});
}

function deferAfterRenderPass(callback: () => void): void {
	if (typeof window !== 'undefined') {
		window.setTimeout(callback, 0);
		return;
	}
	// eslint-disable-next-line obsidianmd/prefer-window-timers -- unit tests import this module in Node
	setTimeout(callback, 0);
}
