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

/** Processor `el` that owns an LP shell (parent of `.abc-blocks-root`). */
export function findProcessorElementFromShell(shellRoot: HTMLElement): HTMLElement | null {
	const root = shellRoot.closest('.abc-blocks-root');
	const processor = root?.parentElement;
	if (!processor || typeof processor.setAttribute !== 'function') {
		return null;
	}
	return processor;
}

/**
 * Block index on the processor host or its LP shell.
 * Processor `el` first — survives `el.empty()` and skip-rerender writes that
 * may not yet update the shell; shell is fallback when processor has no attr.
 */
export function readPersistedBlockIndex(processorEl: HTMLElement): number | null {
	const onProcessor = parseBlockIndexAttr(
		processorEl.getAttribute(ABC_BLOCK_INDEX_ATTR),
	);
	if (onProcessor !== null) {
		return onProcessor;
	}

	const shell = processorEl.querySelector('.abc-blocks-live-preview');
	return parseBlockIndexAttr(shell?.getAttribute(ABC_BLOCK_INDEX_ATTR) ?? null);
}

/** Keep processor `el` and shell attrs in sync (shell is updated after layout reconcile). */
export function writePersistedBlockIdentityToShellAndProcessor(
	shellRoot: HTMLElement,
	blockIndex: number,
	openLine: number,
): void {
	shellRoot.setAttribute(ABC_BLOCK_INDEX_ATTR, String(blockIndex));
	shellRoot.setAttribute(ABC_OPEN_LINE_ATTR, String(openLine));
	const processor = findProcessorElementFromShell(shellRoot);
	if (processor) {
		writePersistedBlockIdentity(processor, blockIndex, openLine);
	}
}

export function writePersistedBlockIdentity(
	processorEl: HTMLElement,
	blockIndex: number,
	openLine: number,
): void {
	processorEl.setAttribute(ABC_BLOCK_INDEX_ATTR, String(blockIndex));
	processorEl.setAttribute(ABC_OPEN_LINE_ATTR, String(openLine));
}
