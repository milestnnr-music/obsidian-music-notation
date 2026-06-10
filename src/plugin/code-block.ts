import { MarkdownPostProcessorContext, Plugin } from 'obsidian';

/** Fenced-code language tag for music blocks (` ```abc `). */
export const ABC_BLOCK_LANGUAGE = 'abc';

/**
 * Phase 1.1: Register the ```abc markdown code block processor.
 * Later phases attach render/edit behavior in the handler.
 */
export function registerAbcCodeBlockProcessor(plugin: Plugin): void {
	plugin.registerMarkdownCodeBlockProcessor(
		ABC_BLOCK_LANGUAGE,
		handleAbcCodeBlock,
	);
}

function handleAbcCodeBlock(
	_source: string,
	el: HTMLElement,
	_ctx: MarkdownPostProcessorContext,
): void {
	el.empty();
	el.createDiv({ cls: 'abc-blocks-root' });
}
