import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import { mountEditorWidget } from '../editor/editor-widget';

class AbcLivePreviewShell extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private readonly source: string,
	) {
		super(containerEl);
	}

	onload(): void {
		mountEditorWidget(this.containerEl, this.source);
	}
}

/**
 * Phase 1.3: Live Preview — interactive editing shell (widget in Phase 5).
 * Runs only when the block is rendered inside the source editor preview layer.
 */
export function renderLivePreview(
	root: HTMLElement,
	source: string,
	ctx: MarkdownPostProcessorContext,
): void {
	const container = root.createDiv({
		cls: ['abc-blocks-live-preview', 'abc-blocks-interactive'],
	});

	container.createDiv({
		cls: 'abc-blocks-view-badge',
		text: 'Live Preview',
	});

	container.createDiv({
		cls: 'abc-blocks-interactive-label',
		text: 'Interactive editor shell (toolbar and staff in Phase 5)',
	});

	const mountPoint = container.createDiv({ cls: 'abc-blocks-editor-mount' });
	ctx.addChild(new AbcLivePreviewShell(mountPoint, source));
}
