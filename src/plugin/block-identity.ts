/** Persisted on the processor element — survives `el.empty()` child teardown. */
export const ABC_BLOCK_INDEX_ATTR = 'data-abc-block-index';
export const ABC_OPEN_LINE_ATTR = 'data-abc-open-line';

export function parseBlockIndexAttr(raw: string | null | undefined): number | null {
	if (!raw) {
		return null;
	}
	const index = Number(raw);
	return Number.isFinite(index) && index >= 0 ? index : null;
}

export function parseBlockOpenLineAttr(raw: string | null | undefined): number | null {
	if (!raw) {
		return null;
	}
	const line = Number(raw);
	return Number.isFinite(line) ? line : null;
}

/** Block index stored on the processor host or its live preview shell. */
export function readPersistedBlockIndex(processorEl: HTMLElement): number | null {
	const onHost = parseBlockIndexAttr(processorEl.getAttribute(ABC_BLOCK_INDEX_ATTR));
	if (onHost !== null) {
		return onHost;
	}

	const shell = processorEl.querySelector('.abc-blocks-live-preview');
	return parseBlockIndexAttr(shell?.getAttribute(ABC_BLOCK_INDEX_ATTR) ?? null);
}

export function writePersistedBlockIdentity(
	processorEl: HTMLElement,
	blockIndex: number,
	openLine: number,
): void {
	processorEl.setAttribute(ABC_BLOCK_INDEX_ATTR, String(blockIndex));
	processorEl.setAttribute(ABC_OPEN_LINE_ATTR, String(openLine));
}
