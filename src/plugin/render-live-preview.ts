import { App, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import {
	abcHasMusicLines,
	getAbcBlockContentState,
	isEmptyAbcBlockSource,
	resolveAbcBlockSourceAsync,
} from './block-source';
import { mountEditorWidget } from '../editor/editor-widget';

class AbcLivePreviewShell extends MarkdownRenderChild {
	private lastSource = '';
	private refreshTimer: number | null = null;

	constructor(
		containerEl: HTMLElement,
		private readonly app: App,
		private readonly ctx: MarkdownPostProcessorContext,
		private readonly resolvedSource: string,
		private readonly processorSource: string,
		private readonly blockLineHint: number | null,
	) {
		super(containerEl);
	}

	onload(): void {
		this.mount(this.resolvedSource);
		this.registerEvent(
			this.app.workspace.on('editor-change', (_editor, view) => {
				if (view.file?.path !== this.ctx.sourcePath) return;
				if (this.refreshTimer !== null) {
					window.clearTimeout(this.refreshTimer);
				}
				this.refreshTimer = window.setTimeout(() => {
					void this.refreshFromEditor();
				}, 400);
			}),
		);
	}

	onunload(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}
	}

	private async refreshFromEditor(): Promise<void> {
		const resolved = await resolveAbcBlockSourceAsync(
			this.app,
			this.ctx,
			this.processorSource,
			null,
			this.blockLineHint,
		);
		this.mount(resolved);
	}

	private mount(source: string): void {
		if (
			abcHasMusicLines(this.lastSource) &&
			!abcHasMusicLines(source) &&
			!isEmptyAbcBlockSource(source) &&
			this.containerEl.dataset.abcRendered === 'true'
		) {
			return;
		}

		if (source === this.lastSource && this.containerEl.dataset.abcRendered === 'true') {
			return;
		}

		this.lastSource = source;
		mountEditorWidget(
			this.containerEl,
			source,
			isEmptyAbcBlockSource(source),
		);
	}
}

/**
 * Phase 1.3: Live Preview — interactive editing shell (widget in Phase 5).
 * Runs only when the block is rendered inside the source editor preview layer.
 */
export function renderLivePreview(
	root: HTMLElement,
	resolvedSource: string,
	processorSource: string,
	ctx: MarkdownPostProcessorContext,
	app: App,
	blockLineHint: number | null,
): void {
	const contentState = getAbcBlockContentState(resolvedSource);
	const isEmpty = contentState === 'empty';

	const container = root.createDiv({
		cls: ['abc-blocks-live-preview', 'abc-blocks-interactive'],
		attr: {
			'data-abc-content': contentState,
			'data-abc-resolved-music': String(abcHasMusicLines(resolvedSource)),
		},
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
			? 'New example — 4/4, C major, treble. Toolbar in Phase 5.'
			: 'Interactive editor shell (toolbar and staff in Phase 5)',
	});

	const mountPoint = container.createDiv({ cls: 'abc-blocks-editor-mount' });
	ctx.addChild(
		new AbcLivePreviewShell(
			mountPoint,
			app,
			ctx,
			resolvedSource,
			processorSource,
			blockLineHint,
		),
	);
}
