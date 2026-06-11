import type { App } from 'obsidian';
import {
	type AbcBlockSectionInfo,
	findAllAbcBlockFenceOpenLines,
	openLineForAbcBlockIndex,
	resolveAbcBlockIdentity,
} from '../editor/abc-block-patch';
import {
	findMarkdownViewContaining,
	getMarkdownFromView,
} from './block-source';

/** Stable ```abc block identity from Live Preview DOM order. */
export interface PreviewDomBlockIdentity {
	readonly openLine: number;
	readonly blockIndex: number;
}

/** CM6 Live Preview embed or Reading view block host for one ```abc fence. */
export function findAbcBlockEmbedHost(element: HTMLElement): HTMLElement | null {
	const embed = element.closest('.cm-embed-block');
	if (embed?.instanceOf(HTMLElement) && isAbcLanguageEmbed(embed)) {
		return embed;
	}

	const blockLanguage = element.closest('[class*="block-language-abc"]');
	if (blockLanguage?.instanceOf(HTMLElement)) {
		return blockLanguage;
	}

	return null;
}

function isAbcLanguageEmbed(element: HTMLElement): boolean {
	return Array.from(element.classList).some(
		(className) =>
			className === 'cm-language-abc' || className.includes('language-abc'),
	);
}

/** Embed host that directly contains this processor output element. */
export function findEmbedHostContainingProcessor(
	previewRoot: ParentNode,
	processorEl: HTMLElement,
): HTMLElement | null {
	for (const host of listAbcBlockEmbedHosts(previewRoot)) {
		if (host.contains(processorEl)) {
			return host;
		}
	}
	return null;
}

/** Every ```abc embed host in the preview, in document order. */
export function listAbcBlockEmbedHosts(previewRoot: ParentNode): HTMLElement[] {
	const hosts: HTMLElement[] = [];
	const seen = new Set<HTMLElement>();

	for (const candidate of Array.from(previewRoot.querySelectorAll('.cm-embed-block'))) {
		if (!candidate.instanceOf(HTMLElement) || !isAbcLanguageEmbed(candidate)) {
			continue;
		}
		if (seen.has(candidate)) {
			continue;
		}
		seen.add(candidate);
		hosts.push(candidate);
	}

	if (hosts.length > 0) {
		return hosts;
	}

	for (const candidate of Array.from(
		previewRoot.querySelectorAll('[class*="block-language-abc"]'),
	)) {
		if (!candidate.instanceOf(HTMLElement) || seen.has(candidate)) {
			continue;
		}
		seen.add(candidate);
		hosts.push(candidate);
	}

	return hosts;
}

/**
 * True when every markdown fence has a matching preview embed host.
 * False during inline embed source edit (first block's preview host is often hidden).
 */
export function isAbcEmbedHostCountReliable(
	embedHostCount: number,
	fenceCount: number,
): boolean {
	return embedHostCount > 0 && embedHostCount === fenceCount;
}

/**
 * Resolve ```abc block identity in Live Preview for one processor `el`.
 * Prefers the embed host that **contains** the processor (not `closest`, which can
 * climb to a sibling's embed). Falls back to section/body/ordinal resolution.
 */
export async function resolvePreviewBlockIdentity(
	app: App,
	processorEl: HTMLElement,
	sourcePath: string,
	sectionInfo: AbcBlockSectionInfo | null,
	processorSource: string,
	renderOrdinal: number,
	ambiguousSectionLineStarts: ReadonlySet<number> = new Set(),
): Promise<PreviewDomBlockIdentity | null> {
	const view = findMarkdownViewContaining(app, sourcePath, processorEl);
	if (!view) {
		return null;
	}

	const markdown = getMarkdownFromView(view);
	const openLines = findAllAbcBlockFenceOpenLines(markdown);
	if (openLines.length === 0) {
		return null;
	}
	if (openLines.length === 1) {
		const openLine = openLines[0];
		return openLine !== undefined ? { openLine, blockIndex: 0 } : null;
	}

	const previewRoot =
		view.contentEl.querySelector('.markdown-source-view') ?? view.contentEl;
	const hosts = listAbcBlockEmbedHosts(previewRoot);
	const host = findEmbedHostContainingProcessor(previewRoot, processorEl);

	if (
		host &&
		isAbcEmbedHostCountReliable(hosts.length, openLines.length)
	) {
		const blockIndex = hosts.indexOf(host);
		if (blockIndex >= 0 && blockIndex < openLines.length) {
			const openLine = openLines[blockIndex];
			if (openLine !== undefined) {
				return { openLine, blockIndex };
			}
		}
	}

	return resolveAbcBlockIdentity(
		markdown,
		sectionInfo,
		processorSource,
		renderOrdinal,
		ambiguousSectionLineStarts,
	);
}

/**
 * Embed-host block index when host count matches fence count.
 * Synchronous — safe to call from sync button handlers.
 */
export function resolveDomBlockIndexWhenReliable(
	app: App,
	processorEl: HTMLElement,
	sourcePath: string,
): number | null {
	const view = findMarkdownViewContaining(app, sourcePath, processorEl);
	if (!view) {
		return null;
	}

	const markdown = getMarkdownFromView(view);
	const openLines = findAllAbcBlockFenceOpenLines(markdown);
	if (openLines.length <= 1) {
		return openLines.length === 1 ? 0 : null;
	}

	const previewRoot =
		view.contentEl.querySelector('.markdown-source-view') ?? view.contentEl;
	const hosts = listAbcBlockEmbedHosts(previewRoot);
	const host = findEmbedHostContainingProcessor(previewRoot, processorEl);

	if (
		!host ||
		!isAbcEmbedHostCountReliable(hosts.length, openLines.length)
	) {
		return null;
	}

	const blockIndex = hosts.indexOf(host);
	return blockIndex >= 0 && blockIndex < openLines.length ? blockIndex : null;
}

/**
 * LP processor identity: DOM embed index when reliable; else persisted attrs
 * (inline source edit); else section/body heuristics — never blind ordinal.
 */
export async function resolveLivePreviewProcessorIdentity(
	app: App,
	processorEl: HTMLElement,
	sourcePath: string,
	sectionInfo: AbcBlockSectionInfo | null,
	processorSource: string,
	renderOrdinal: number,
	ambiguousSectionLineStarts: ReadonlySet<number>,
	persistedIndex: number | null,
	markdown: string,
): Promise<PreviewDomBlockIdentity | null> {
	const mappingUnreliable = await isPreviewAbcMappingUnreliable(
		app,
		processorEl,
		sourcePath,
	);

	if (!mappingUnreliable) {
		const domIndex = resolveDomBlockIndexWhenReliable(app, processorEl, sourcePath);
		if (domIndex !== null) {
			const openLine = openLineForAbcBlockIndex(markdown, domIndex);
			if (openLine !== null) {
				return { blockIndex: domIndex, openLine };
			}
		}
	}

	if (persistedIndex !== null) {
		const openLine = openLineForAbcBlockIndex(markdown, persistedIndex);
		if (openLine !== null) {
			return { blockIndex: persistedIndex, openLine };
		}
	}

	return resolveAbcBlockIdentity(
		markdown,
		sectionInfo,
		processorSource,
		renderOrdinal,
		ambiguousSectionLineStarts,
	);
}

/** @deprecated Use resolvePreviewBlockIdentity — kept for call-site migration. */
export async function resolveBlockOpenLineFromPreviewDom(
	app: App,
	element: HTMLElement,
	sourcePath: string,
): Promise<PreviewDomBlockIdentity | null> {
	return resolvePreviewBlockIdentity(app, element, sourcePath, null, '', 0);
}

/**
 * True when a sibling ```abc block is in inline source edit (preview embed hidden).
 * DOM index mapping and processor render ordinals are unreliable in this state.
 */
export async function isPreviewAbcMappingUnreliable(
	app: App,
	processorEl: HTMLElement,
	sourcePath: string,
): Promise<boolean> {
	const view = findMarkdownViewContaining(app, sourcePath, processorEl);
	if (!view) {
		return false;
	}

	const previewRoot =
		view.contentEl.querySelector('.markdown-source-view') ?? view.contentEl;
	const hosts = listAbcBlockEmbedHosts(previewRoot);

	const markdown = getMarkdownFromView(view);
	const fenceCount = findAllAbcBlockFenceOpenLines(markdown).length;
	if (fenceCount <= 1) {
		return false;
	}
	if (!isAbcEmbedHostCountReliable(hosts.length, fenceCount)) {
		return true;
	}
	return findEmbedHostContainingProcessor(previewRoot, processorEl) === null;
}

/** Defer until embed siblings have mounted (processor order ≠ document order in LP). */
export function afterPreviewLayout(callback: () => void): void {
	if (typeof window !== 'undefined') {
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(callback);
		});
		return;
	}
	// eslint-disable-next-line obsidianmd/prefer-window-timers -- unit tests import this module in Node
	setTimeout(callback, 0);
}
