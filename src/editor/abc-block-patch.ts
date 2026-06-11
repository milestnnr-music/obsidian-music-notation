import {
	extractAllAbcBlockBodies,
	isEmptyAbcBlockSource,
	normalizeAbcBlockBody,
} from '../plugin/block-source';

const ABC_FENCE_OPEN = /^```abc\b/i;
const FENCE_CLOSE = /^```\s*$/;

/** Line indices for a single ```abc fence in a note (0-based). */
export interface AbcBlockFenceRange {
	readonly openLine: number;
	readonly bodyStartLine: number;
	readonly bodyEndLine: number;
	readonly closeLine: number;
	readonly blockIndex: number;
}

export interface AbcBlockSectionInfo {
	readonly text: string;
	readonly lineStart: number;
	readonly lineEnd: number;
}

/** Resolved ```abc block in a note (fence open line + 0-based index). */
export interface AbcBlockIdentity {
	readonly openLine: number;
	readonly blockIndex: number;
}

function identityFromOpenLine(
	openLines: number[],
	openLine: number,
): AbcBlockIdentity | null {
	const blockIndex = openLines.indexOf(openLine);
	if (blockIndex < 0) {
		return null;
	}
	return { openLine, blockIndex };
}

/**
 * Resolve block identity without DOM. Section range → body match → empty fence → ordinal.
 * Used when embed host mapping is missing or unreliable (LP often reports duplicate lineStart).
 */
export function resolveAbcBlockIdentity(
	markdown: string,
	sectionInfo: AbcBlockSectionInfo | null,
	processorSource: string,
	renderOrdinal: number,
	ambiguousSectionLineStarts: ReadonlySet<number> = new Set(),
): AbcBlockIdentity | null {
	const openLines = findAllAbcBlockFenceOpenLines(markdown);
	if (openLines.length === 0) {
		return null;
	}
	if (openLines.length === 1) {
		const openLine = openLines[0];
		return openLine !== undefined ? { openLine, blockIndex: 0 } : null;
	}

	if (sectionInfo) {
		const fromRange = resolveOpenLineFromSectionRange(markdown, sectionInfo);
		if (fromRange !== null) {
			const identity = identityFromOpenLine(openLines, fromRange);
			if (identity) {
				return identity;
			}
		}
	}

	const processorBody = normalizeAbcBlockBody(processorSource);
	if (processorBody.length > 0) {
		const match = matchOpenLineByBody(markdown, openLines, processorBody);
		if (match !== null) {
			return identityFromOpenLine(openLines, match);
		}
	}

	const sectionBody = sectionInfo?.text
		? normalizeAbcBlockBody(sectionInfo.text)
		: '';
	if (sectionBody.length > 0) {
		const match = matchOpenLineByBody(markdown, openLines, sectionBody);
		if (match !== null) {
			return identityFromOpenLine(openLines, match);
		}
	}

	if (!processorBody.length) {
		const emptyOpenLines = openLines.filter((line) => {
			const body = extractAbcBlockBodyAtOpenLine(markdown, line) ?? '';
			return isEmptyAbcBlockSource(body);
		});
		if (emptyOpenLines.length === 1) {
			const openLine = emptyOpenLines[0];
			if (openLine !== undefined) {
				return identityFromOpenLine(openLines, openLine);
			}
		}
		// Multiple empty fences: never use renderOrdinal — processors often re-run
		// one at a time (ordinal always 0). Use DOM embed index in LP instead.
	}

	const sectionLine = sectionInfo?.lineStart;
	const sectionLineIsTrusted =
		sectionLine !== undefined &&
		sectionLine !== null &&
		!ambiguousSectionLineStarts.has(sectionLine);
	if (sectionLineIsTrusted) {
		const exact = openLines.find((line) => line === sectionLine);
		if (exact !== undefined) {
			return identityFromOpenLine(openLines, exact);
		}
	}

	// renderOrdinal is only meaningful when every processor runs in one pass (rare in LP).
	if (openLines.length === 1 && renderOrdinal === 0) {
		const openLine = openLines[0];
		if (openLine !== undefined) {
			return { openLine, blockIndex: 0 };
		}
	}

	return null;
}

/** Opening fence line for the Nth ```abc block in document order (0-based index). */
export function openLineForAbcBlockIndex(
	markdown: string,
	blockIndex: number,
): number | null {
	const openLines = findAllAbcBlockFenceOpenLines(markdown);
	return openLines[blockIndex] ?? null;
}

/** Opening fence line (0-based) for every ```abc block in document order. */
export function findAllAbcBlockFenceOpenLines(markdown: string): number[] {
	const lines = markdown.split(/\r?\n/);
	const openLines: number[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (!ABC_FENCE_OPEN.test(line.trim())) {
			continue;
		}

		openLines.push(i);
		i++;
		while (i < lines.length) {
			if (FENCE_CLOSE.test((lines[i] ?? '').trim())) {
				break;
			}
			i++;
		}
	}

	return openLines;
}

/** Opening fence line inside a markdown section span from `getSectionInfo`. */
export function resolveOpenLineFromSectionRange(
	markdown: string,
	sectionInfo: AbcBlockSectionInfo,
): number | null {
	const lines = markdown.split(/\r?\n/);
	const start = Math.max(0, sectionInfo.lineStart);
	const end = Math.min(lines.length - 1, sectionInfo.lineEnd);

	for (let i = start; i <= end; i++) {
		if (ABC_FENCE_OPEN.test((lines[i] ?? '').trim())) {
			return i;
		}
	}

	return null;
}

/** Fence body for one block, keyed by its opening fence line. */
export function extractAbcBlockBodyAtOpenLine(
	markdown: string,
	blockOpenLine: number,
): string | null {
	const openLines = findAllAbcBlockFenceOpenLines(markdown);
	const index = openLines.indexOf(blockOpenLine);
	if (index < 0) {
		return null;
	}

	const bodies = extractAllAbcBlockBodies(markdown);
	return bodies[index] ?? '';
}

function matchOpenLineByBody(
	markdown: string,
	openLines: number[],
	body: string,
): number | null {
	const bodies = extractAllAbcBlockBodies(markdown);
	const matches: number[] = [];

	for (let i = 0; i < bodies.length; i++) {
		const candidate = bodies[i];
		const openLine = openLines[i];
		if (candidate === undefined || openLine === undefined) {
			continue;
		}
		if (normalizeAbcBlockBody(candidate) === body) {
			matches.push(openLine);
		}
	}

	if (matches.length === 1) {
		return matches[0] ?? null;
	}

	return null;
}

/**
 * Locate the ```abc fence to patch. `blockOpenLine` must be the opening fence line.
 */
export function findAbcBlockFenceRange(
	markdown: string,
	blockOpenLine: number | null,
): AbcBlockFenceRange | null {
	const lines = markdown.split(/\r?\n/);
	const candidates: AbcBlockFenceRange[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (!ABC_FENCE_OPEN.test(line.trim())) {
			continue;
		}

		const openLine = i;
		i++;
		const bodyStartLine = i;

		while (i < lines.length) {
			const bodyLine = lines[i] ?? '';
			if (FENCE_CLOSE.test(bodyLine.trim())) {
				candidates.push({
					openLine,
					bodyStartLine,
					bodyEndLine: i - 1,
					closeLine: i,
					blockIndex: candidates.length,
				});
				break;
			}
			i++;
		}
	}

	if (candidates.length === 0) {
		return null;
	}
	if (blockOpenLine !== null) {
		const exact = candidates.find((range) => range.openLine === blockOpenLine);
		if (exact) {
			return exact;
		}
		return null;
	}

	return candidates[0] ?? null;
}

/** Replace the interior of a ```abc fence, keeping opening and closing fences. */
export function replaceAbcBlockBodyInMarkdown(
	markdown: string,
	blockOpenLine: number | null,
	newBody: string,
): string | null {
	const range = findAbcBlockFenceRange(markdown, blockOpenLine);
	if (!range) {
		return null;
	}

	const lines = markdown.split(/\r?\n/);
	const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
	const newBodyLines = newBody.length > 0 ? newBody.split('\n') : [];

	const before = lines.slice(0, range.openLine + 1);
	const after = lines.slice(range.closeLine);

	return [...before, ...newBodyLines, ...after].join(eol);
}

/** True when the fence has no body lines between open and close. */
export function isAbcBlockBodyEmpty(range: AbcBlockFenceRange): boolean {
	return range.bodyStartLine > range.bodyEndLine;
}
