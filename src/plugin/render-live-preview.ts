import { App, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import {
	abcHasMusicLines,
	getAbcBlockContentState,
	isEmptyAbcBlockSource,
	resolveAbcBlockSourceAsync,
} from './block-source';
import {
	afterPreviewLayout,
	resolveBlockOpenLineFromPreviewDom,
} from './block-dom';
import { mountEditorWidget } from '../editor/editor-widget';
import { flushAbcSyncScheduler } from '../editor/sync-lifecycle';
import {
	ABC_SYNC_DEBOUNCE_MS,
	AbcSyncScheduler,
	runPhase41SyncTest,
	runPhase43FirstEditTest,
	type AbcBlockSyncContext,
} from '../editor/sync';

const ABC_OPEN_LINE_ATTR = 'data-abc-open-line';

function parseBlockOpenLine(shellRoot: HTMLElement): number | null {
	const raw = shellRoot.getAttribute(ABC_OPEN_LINE_ATTR);
	if (!raw) {
		return null;
	}
	const line = Number(raw);
	return Number.isFinite(line) ? line : null;
}

class AbcLivePreviewShell extends MarkdownRenderChild {
	private lastSource = '';
	private refreshTimer: number | null = null;
	private readonly syncScheduler = new AbcSyncScheduler();
	private resolvedBlockOpenLine: number | null;
	private readonly startedAsEmptyFence: boolean;

	constructor(
		containerEl: HTMLElement,
		private readonly shellRoot: HTMLElement,
		private readonly app: App,
		private readonly ctx: MarkdownPostProcessorContext,
		private readonly resolvedSource: string,
		private readonly processorSource: string,
		blockOpenLine: number | null,
	) {
		super(containerEl);
		this.resolvedBlockOpenLine = blockOpenLine;
		this.startedAsEmptyFence = isEmptyAbcBlockSource(resolvedSource);
	}

	onload(): void {
		this.mountSyncTestButton();
		this.mount(this.resolvedSource);
		afterPreviewLayout(() => {
			void this.reconcileAfterLayout();
		});
		this.registerEvent(
			this.app.workspace.on('editor-change', (_editor, view) => {
				if (view.file?.path !== this.ctx.sourcePath) return;
				if (this.refreshTimer !== null) {
					window.clearTimeout(this.refreshTimer);
				}
				this.refreshTimer = window.setTimeout(() => {
					void this.refreshFromEditor();
				}, ABC_SYNC_DEBOUNCE_MS);
			}),
		);
	}

	onunload(): void {
		flushAbcSyncScheduler(this.syncScheduler);
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	/**
	 * Resolve this block's fence line from preview DOM order (authoritative in LP).
	 * Processor call order and cached `data-abc-open-line` are not reliable alone.
	 */
	private async resolveBlockOpenLine(): Promise<number | null> {
		const fromDom = await resolveBlockOpenLineFromPreviewDom(
			this.app,
			this.shellRoot,
			this.ctx.sourcePath,
		);
		if (fromDom !== null) {
			this.resolvedBlockOpenLine = fromDom;
			this.shellRoot.setAttribute(ABC_OPEN_LINE_ATTR, String(fromDom));
			return fromDom;
		}

		return parseBlockOpenLine(this.shellRoot) ?? this.resolvedBlockOpenLine;
	}

	private async reconcileAfterLayout(): Promise<void> {
		const blockOpenLine = await this.resolveBlockOpenLine();
		if (blockOpenLine === null) {
			return;
		}

		const resolved = await resolveAbcBlockSourceAsync(
			this.app,
			this.ctx,
			this.processorSource,
			null,
			blockOpenLine,
		);
		this.mount(resolved);
	}

	private async syncContext(): Promise<AbcBlockSyncContext> {
		return {
			app: this.app,
			sourcePath: this.ctx.sourcePath,
			blockOpenLine: await this.resolveBlockOpenLine(),
		};
	}

	private mountSyncTestButton(): void {
		const existing = this.shellRoot.querySelector('.abc-blocks-sync-test');
		if (existing) {
			return;
		}

		const row = this.shellRoot.createDiv({ cls: 'abc-blocks-sync-test' });

		if (this.startedAsEmptyFence) {
			const firstEditButton = row.createEl('button', {
				cls: 'abc-blocks-sync-test-btn',
				text: 'Place first note (phase 4.3)',
			});
			firstEditButton.setAttr('type', 'button');
			this.registerDomEvent(firstEditButton, 'click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				void this.handleFirstEditTestClick();
			});
			return;
		}

		const button = row.createEl('button', {
			cls: 'abc-blocks-sync-test-btn',
			text: 'Write test note (phase 4.2)',
		});
		button.setAttr('type', 'button');

		this.registerDomEvent(button, 'click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void this.handleSyncTestClick();
		});
	}

	private async handleSyncTestClick(): Promise<void> {
		const ctx = await this.syncContext();
		runPhase41SyncTest(ctx, this.syncScheduler);
	}

	private async handleFirstEditTestClick(): Promise<void> {
		const ctx = await this.syncContext();
		runPhase43FirstEditTest(ctx, this.syncScheduler);
	}

	private async refreshFromEditor(): Promise<void> {
		const blockOpenLine = await this.resolveBlockOpenLine();
		const resolved = await resolveAbcBlockSourceAsync(
			this.app,
			this.ctx,
			this.processorSource,
			null,
			blockOpenLine,
		);
		this.mount(resolved);
	}

	private mount(source: string): void {
		const isEmpty = isEmptyAbcBlockSource(source);

		if (
			abcHasMusicLines(this.lastSource) &&
			!abcHasMusicLines(source) &&
			!isEmpty &&
			this.containerEl.dataset.abcRendered === 'true'
		) {
			return;
		}

		if (source === this.lastSource && this.containerEl.dataset.abcRendered === 'true') {
			return;
		}

		this.lastSource = source;
		this.shellRoot.setAttr('data-abc-content', isEmpty ? 'empty' : 'has-content');
		this.shellRoot.setAttr(
			'data-abc-resolved-music',
			String(abcHasMusicLines(source)),
		);
		this.shellRoot.toggleClass('abc-blocks-empty', isEmpty);

		mountEditorWidget(this.containerEl, source, isEmpty);
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
	blockOpenLine: number | null,
): void {
	const contentState = getAbcBlockContentState(resolvedSource);
	const isEmpty = contentState === 'empty';

	const container = root.createDiv({
		cls: ['abc-blocks-live-preview', 'abc-blocks-interactive'],
		attr: {
			'data-abc-content': contentState,
			'data-abc-resolved-music': String(abcHasMusicLines(resolvedSource)),
			...(blockOpenLine !== null
				? { [ABC_OPEN_LINE_ATTR]: String(blockOpenLine) }
				: {}),
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
			container,
			app,
			ctx,
			resolvedSource,
			processorSource,
			blockOpenLine,
		),
	);
}
