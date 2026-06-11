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
