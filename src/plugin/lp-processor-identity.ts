import type { AbcBlockSectionInfo } from '../editor/abc-block-patch';
import {
	openLineForAbcBlockIndex,
	resolveAbcBlockIdentity,
} from '../editor/abc-block-patch';
import type { LpEmbedSnapshot } from './lp-embed-snapshot';
import { domBlockIndexWhenReliable } from './lp-embed-snapshot';

export interface LpProcessorIdentity {
	readonly blockIndex: number;
	readonly openLine: number;
}

export interface LpProcessorIdentityInput {
	readonly snapshot: LpEmbedSnapshot;
	readonly persistedBlockIndex: number | null;
	readonly sectionInfo: AbcBlockSectionInfo | null;
	readonly processorSource: string;
	readonly renderOrdinal: number;
	readonly ambiguousSectionLineStarts: ReadonlySet<number>;
}

/**
 * Pure LP processor identity — resolution-doc policy:
 * DOM embed index when mapping reliable; else persisted; else heuristics.
 */
export function resolveLpProcessorIdentity(
	input: LpProcessorIdentityInput,
): LpProcessorIdentity | null {
	const { snapshot, persistedBlockIndex } = input;
	const { markdown } = snapshot;

	if (markdown.length === 0) {
		return null;
	}

	const domIndex = domBlockIndexWhenReliable(snapshot);
	if (domIndex !== null) {
		const openLine = openLineForAbcBlockIndex(markdown, domIndex);
		if (openLine !== null) {
			return { blockIndex: domIndex, openLine };
		}
	}

	if (persistedBlockIndex !== null) {
		const openLine = openLineForAbcBlockIndex(markdown, persistedBlockIndex);
		if (openLine !== null) {
			return { blockIndex: persistedBlockIndex, openLine };
		}
	}

	return resolveAbcBlockIdentity(
		markdown,
		input.sectionInfo,
		input.processorSource,
		input.renderOrdinal,
		input.ambiguousSectionLineStarts,
	);
}

/** Skip processor `el.empty()` when inline edit hides a sibling embed and shell is mounted. */
export function shouldSkipProcessorRerender(
	snapshot: LpEmbedSnapshot,
	existingShellMounted: boolean,
	identity: LpProcessorIdentity | null,
): boolean {
	return (
		!snapshot.mappingReliable &&
		identity !== null &&
		existingShellMounted
	);
}
