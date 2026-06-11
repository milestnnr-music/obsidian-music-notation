import { MarkdownView, TFile, type App } from 'obsidian';
import {
	findAllAbcBlockFenceOpenLines,
	openLineForAbcBlockIndex,
} from '../editor/abc-block-patch';
import { readNoteMarkdown } from './block-source';

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

function findMarkdownViewContaining(
	app: App,
	sourcePath: string,
	element: HTMLElement,
): MarkdownView | null {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (
			view instanceof MarkdownView &&
			view.file?.path === sourcePath &&
			view.contentEl.contains(element)
		) {
			return view;
		}
	}

	return app.workspace.getActiveViewOfType(MarkdownView)?.file?.path === sourcePath
		? app.workspace.getActiveViewOfType(MarkdownView)
		: null;
}

/**
 * Map a Live Preview shell to its fence line using DOM order among ```abc embeds.
 * Reliable after the preview has finished laying out every block in the note.
 * Returns null when embed host count ≠ fence count (inline source edit on a sibling).
 */
export async function resolveBlockOpenLineFromPreviewDom(
	app: App,
	element: HTMLElement,
	sourcePath: string,
): Promise<PreviewDomBlockIdentity | null> {
	const host = findAbcBlockEmbedHost(element);
	if (!host) {
		return null;
	}

	const view = findMarkdownViewContaining(app, sourcePath, element);
	if (!view) {
		return null;
	}

	const previewRoot =
		view.contentEl.querySelector('.markdown-source-view') ?? view.contentEl;
	const hosts = listAbcBlockEmbedHosts(previewRoot);
	const blockIndex = hosts.indexOf(host);
	if (blockIndex < 0) {
		return null;
	}

	const file = app.vault.getAbstractFileByPath(sourcePath);
	if (!(file instanceof TFile)) {
		return null;
	}

	const markdown = await readNoteMarkdown(app, file, sourcePath);
	const openLines = findAllAbcBlockFenceOpenLines(markdown);
	if (!isAbcEmbedHostCountReliable(hosts.length, openLines.length)) {
		return null;
	}

	const openLine = openLineForAbcBlockIndex(markdown, blockIndex);
	if (openLine === null) {
		return null;
	}

	return { openLine, blockIndex };
}

/**
 * True when a sibling ```abc block is in inline source edit (preview embed hidden).
 * DOM index mapping and processor render ordinals are unreliable in this state.
 */
export async function isPreviewAbcMappingUnreliable(
	app: App,
	element: HTMLElement,
	sourcePath: string,
): Promise<boolean> {
	const view = findMarkdownViewContaining(app, sourcePath, element);
	if (!view) {
		return false;
	}

	const previewRoot =
		view.contentEl.querySelector('.markdown-source-view') ?? view.contentEl;
	const hosts = listAbcBlockEmbedHosts(previewRoot);

	const file = app.vault.getAbstractFileByPath(sourcePath);
	if (!(file instanceof TFile)) {
		return false;
	}

	const markdown = await readNoteMarkdown(app, file, sourcePath);
	const fenceCount = findAllAbcBlockFenceOpenLines(markdown).length;
	return fenceCount > 1 && !isAbcEmbedHostCountReliable(hosts.length, fenceCount);
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
