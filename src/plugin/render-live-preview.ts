import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import { getAbcBlockContentState } from './block-source';
import { mountEditorWidget } from '../editor/editor-widget';

class AbcLivePreviewShell extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private readonly source: string,
		private readonly isEmpty: boolean,
	) {
		super(containerEl);
	}

	onload(): void {
		mountEditorWidget(this.containerEl, this.source, this.isEmpty);
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
	const contentState = getAbcBlockContentState(source);
	const isEmpty = contentState === 'empty';

	const container = root.createDiv({
		cls: ['abc-blocks-live-preview', 'abc-blocks-interactive'],
		attr: { 'data-abc-content': contentState },
	});

	if (isEmpty) {
		container.addClass('abc-blocks-empty');
	}

	container.createDiv({
		cls: 'abc-blocks-view-badge',
		text: 'Live Preview',
	});

	container.createDiv({
		cls: 'abc-blocks-interactive-label',
		text: isEmpty
			? 'Empty block — click inside to edit; staff shell in Phase 2'
			: 'Interactive editor shell (toolbar and staff in Phase 5)',
	});

	const mountPoint = container.createDiv({ cls: 'abc-blocks-editor-mount' });
	ctx.addChild(new AbcLivePreviewShell(mountPoint, source, isEmpty));
}
