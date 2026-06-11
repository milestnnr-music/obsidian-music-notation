import { App, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import {
	extractAbcBlockBodyAtOpenLine,
	openLineForAbcBlockIndex,
} from '../editor/abc-block-patch';
import {
	abcHasMusicLines,
	getAbcBlockContentState,
	isEmptyAbcBlockSource,
	readAbcBodyAtBlockIndex,
	readNoteMarkdown,
	resolveAbcBlockSourceAsync,
} from './block-source';
import {
	ABC_BLOCK_INDEX_ATTR,
	ABC_OPEN_LINE_ATTR,
	parseBlockIndexAttr,
	parseBlockOpenLineAttr,
} from './block-identity';
import {
	afterPreviewLayout,
	isPreviewAbcMappingUnreliable,
	resolveBlockOpenLineFromPreviewDom,
	type PreviewDomBlockIdentity,
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

class AbcLivePreviewShell extends MarkdownRenderChild {
	private lastSource = '';
	private refreshTimer: number | null = null;
	private readonly syncScheduler = new AbcSyncScheduler();
	private resolvedBlockOpenLine: number | null;
	private resolvedBlockIndex: number | null;
	private readonly startedAsEmptyFence: boolean;

	constructor(
		containerEl: HTMLElement,
		private readonly shellRoot: HTMLElement,
		private readonly app: App,
		private readonly ctx: MarkdownPostProcessorContext,
		private readonly resolvedSource: string,
		private readonly processorSource: string,
		blockOpenLine: number | null,
		blockIndex: number | null,
	) {
		super(containerEl);
		this.resolvedBlockOpenLine = blockOpenLine;
		this.resolvedBlockIndex = blockIndex;
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
					void this.refreshFromEditorStable();
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

	private persistBlockIdentity(openLine: number, blockIndex: number): void {
		this.resolvedBlockOpenLine = openLine;
		this.resolvedBlockIndex = blockIndex;
		this.shellRoot.setAttribute(ABC_OPEN_LINE_ATTR, String(openLine));
		this.shellRoot.setAttribute(ABC_BLOCK_INDEX_ATTR, String(blockIndex));
	}

	private applyDomIdentity(identity: PreviewDomBlockIdentity): number {
		this.persistBlockIdentity(identity.openLine, identity.blockIndex);
		return identity.openLine;
	}

	/**
	 * Stable fence line from cached block index (survives inline embed source edit on
	 * siblings — DOM host lists shrink when block 1 shows raw source in LP).
	 */
	private async resolveBlockOpenLineFromStableIndex(
		markdown: string,
	): Promise<number | null> {
		const blockIndex =
			parseBlockIndexAttr(this.shellRoot.getAttribute(ABC_BLOCK_INDEX_ATTR)) ??
			this.resolvedBlockIndex;
		if (blockIndex === null) {
			return null;
		}

		const openLine = openLineForAbcBlockIndex(markdown, blockIndex);
		if (openLine === null) {
			return null;
		}

		this.persistBlockIdentity(openLine, blockIndex);
		return openLine;
	}

	/**
	 * Resolve fence line for sync writes and post-layout reconcile. May remap from DOM.
	 */
	private async resolveBlockOpenLine(): Promise<number | null> {
		const file = this.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
		if (!(file instanceof TFile)) {
			return null;
		}

		const markdown = await readNoteMarkdown(this.app, file, this.ctx.sourcePath);

		const fromIndex = await this.resolveBlockOpenLineFromStableIndex(markdown);
		if (fromIndex !== null) {
			return fromIndex;
		}

		const fromDom = await resolveBlockOpenLineFromPreviewDom(
			this.app,
			this.shellRoot,
			this.ctx.sourcePath,
		);
		if (fromDom !== null) {
			return this.applyDomIdentity(fromDom);
		}

		const cached =
			parseBlockOpenLineAttr(this.shellRoot.getAttribute(ABC_OPEN_LINE_ATTR)) ??
			this.resolvedBlockOpenLine;
		if (cached === null) {
			return null;
		}

		if (extractAbcBlockBodyAtOpenLine(markdown, cached) !== null) {
			this.resolvedBlockOpenLine = cached;
			return cached;
		}

		return null;
	}

	private currentBlockIndex(): number | null {
		return (
			parseBlockIndexAttr(this.shellRoot.getAttribute(ABC_BLOCK_INDEX_ATTR)) ??
			this.resolvedBlockIndex
		);
	}

	/** Editor-change refresh: never remap DOM index (unreliable during inline source edit). */
	private async resolveBlockOpenLineStable(): Promise<number | null> {
		const file = this.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
		if (!(file instanceof TFile)) {
			return null;
		}

		const markdown = await readNoteMarkdown(this.app, file, this.ctx.sourcePath);

		const fromIndex = await this.resolveBlockOpenLineFromStableIndex(markdown);
		if (fromIndex !== null) {
			return fromIndex;
		}

		const cached =
			parseBlockOpenLineAttr(this.shellRoot.getAttribute(ABC_OPEN_LINE_ATTR)) ??
			this.resolvedBlockOpenLine;
		if (cached === null) {
			return null;
		}

		if (extractAbcBlockBodyAtOpenLine(markdown, cached) !== null) {
			this.resolvedBlockOpenLine = cached;
			return cached;
		}

		return null;
	}

	private async resolveSourceFromEditor(): Promise<string | null> {
		const file = this.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
		if (!(file instanceof TFile)) {
			return null;
		}

		const markdown = await readNoteMarkdown(this.app, file, this.ctx.sourcePath);
		const blockIndex = this.currentBlockIndex();
		if (blockIndex !== null) {
			const fromIndex = readAbcBodyAtBlockIndex(markdown, blockIndex);
			if (fromIndex !== null) {
				return fromIndex;
			}
		}

		const blockOpenLine = await this.resolveBlockOpenLineStable();
		if (blockOpenLine === null) {
			return null;
		}

		return resolveAbcBlockSourceAsync(
			this.app,
			this.ctx,
			this.processorSource,
			null,
			blockOpenLine,
			blockIndex,
		);
	}

	private async reconcileAfterLayout(): Promise<void> {
		if (
			await isPreviewAbcMappingUnreliable(
				this.app,
				this.shellRoot,
				this.ctx.sourcePath,
			)
		) {
			return;
		}

		const resolved = await this.resolveSourceFromEditor();
		if (resolved === null) {
			return;
		}

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

	private async refreshFromEditorStable(): Promise<void> {
		if (
			await isPreviewAbcMappingUnreliable(
				this.app,
				this.shellRoot,
				this.ctx.sourcePath,
			)
		) {
			return;
		}

		const resolved = await this.resolveSourceFromEditor();
		if (resolved === null) {
			return;
		}

		this.mount(resolved);
	}

	private mount(source: string): void {
		const isEmpty = isEmptyAbcBlockSource(source);

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
	blockIndex: number | null = null,
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
			...(blockIndex !== null
				? { [ABC_BLOCK_INDEX_ATTR]: String(blockIndex) }
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
			blockIndex,
		),
	);
}
