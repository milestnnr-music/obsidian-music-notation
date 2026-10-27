import type { App } from 'obsidian';
import { findAllAbcBlockFenceOpenLines } from '../editor/abc-block-patch';
import { findMarkdownViewContaining, getMarkdownFromView } from './block-source';
import {
	findEmbedHostContainingProcessor,
	isAbcEmbedHostCountReliable,
	listAbcBlockEmbedHosts,
} from './block-dom';

/** One read of markdown + LP embed hosts for a processor `el`. */
export interface LpEmbedSnapshot {
	readonly markdown: string;
	readonly fenceOpenLines: readonly number[];
	readonly fenceCount: number;
	readonly domEmbedIndex: number | null;
	readonly mappingReliable: boolean;
}

/** The Live Preview source view, or the whole leaf when that wrapper is not in the DOM yet. */
function previewRootForView(view: { contentEl: HTMLElement }): HTMLElement {
	return view.contentEl.querySelector('.markdown-source-view') ?? view.contentEl;
}

/** True when embed hosts cannot be lined up with fences, which happens while one block is being edited inline. */
function isLpMappingUnreliable(
	fenceCount: number,
	embedHostCount: number,
	processorHost: HTMLElement | null,
): boolean {
	if (fenceCount <= 1) {
		return false;
	}
	if (!isAbcEmbedHostCountReliable(embedHostCount, fenceCount)) {
		return true;
	}
	return processorHost === null;
}

/** Pure: build snapshot from markdown and an LP preview root (tests + happy-dom). */
export function buildLpEmbedSnapshotFromDom(
	markdown: string,
	previewRoot: ParentNode,
	processorEl: HTMLElement,
): LpEmbedSnapshot {
	const fenceOpenLines = findAllAbcBlockFenceOpenLines(markdown);
	const fenceCount = fenceOpenLines.length;
	const hosts = listAbcBlockEmbedHosts(previewRoot);
	const host = findEmbedHostContainingProcessor(previewRoot, processorEl);
	const domEmbedIndex =
		host !== null && hosts.indexOf(host) >= 0 ? hosts.indexOf(host) : null;
	const mappingReliable = !isLpMappingUnreliable(fenceCount, hosts.length, host);

	return {
		markdown,
		fenceOpenLines,
		fenceCount,
		domEmbedIndex,
		mappingReliable,
	};
}

/** Obsidian adapter: one fetch of view, markdown, and embed hosts. */
export function buildLpEmbedSnapshot(
	app: App,
	processorEl: HTMLElement,
	sourcePath: string,
): LpEmbedSnapshot | null {
	const view = findMarkdownViewContaining(app, sourcePath, processorEl);
	if (!view) {
		return null;
	}

	return buildLpEmbedSnapshotFromDom(
		getMarkdownFromView(view),
		previewRootForView(view),
		processorEl,
	);
}

/** DOM block index when embed host count matches fence count. */
export function domBlockIndexWhenReliable(snapshot: LpEmbedSnapshot): number | null {
	if (!snapshot.mappingReliable || snapshot.domEmbedIndex === null) {
		return null;
	}
	return snapshot.domEmbedIndex;
}
