import { App, MarkdownPostProcessorContext, MarkdownRenderChild, Notice, TFile } from 'obsidian';
import {
	type AbcBlockSectionInfo,
	openLineForAbcBlockIndex,
} from '../editor/abc-block-patch';
import {
	buildPhase45ProbeShell,
	noteMarkdownForProbe,
	recordPhase45ProbeShell,
	schedulePhase45ProbeFlush,
} from '../dev/phase-45-probe';
import {
	abcHasMusicLines,
	getAbcBlockContentState,
	isEmptyAbcBlockSource,
	readAbcBodyAtBlockIndex,
	readNoteMarkdown,
} from './block-source';
import {
	ABC_BLOCK_INDEX_ATTR,
	ABC_OPEN_LINE_ATTR,
	parseBlockIndexAttr,
	parseBlockOpenLineAttr,
	writePersistedBlockIdentityToShellAndProcessor,
} from './block-identity';
import { afterPreviewLayout } from './block-dom';
import {
	buildLpEmbedSnapshot,
	domBlockIndexWhenReliable,
	type LpEmbedSnapshot,
} from './lp-embed-snapshot';
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

	constructor(
		containerEl: HTMLElement,
		private readonly shellRoot: HTMLElement,
		private readonly processorEl: HTMLElement,
		private readonly app: App,
		private readonly ctx: MarkdownPostProcessorContext,
		private readonly resolvedSource: string,
		private readonly processorSource: string,
		private readonly sectionInfo: AbcBlockSectionInfo | null,
		private readonly renderOrdinal: number,
		private readonly ambiguousLineStarts: ReadonlySet<number>,
		blockOpenLine: number | null,
		blockIndex: number | null,
	) {
		super(containerEl);
		this.resolvedBlockOpenLine = blockOpenLine;
		this.resolvedBlockIndex = blockIndex;
	}

	onload(): void {
		void this.bootstrapShell();
		this.registerEvent(
			this.app.workspace.on('editor-change', (_editor, view) => {
				if (view.file?.path !== this.ctx.sourcePath) return;
				if (this.refreshTimer !== null) {
					window.clearTimeout(this.refreshTimer);
				}
				this.refreshTimer = window.setTimeout(() => {
					void this.reconcileFromEditorByIndex('editor-change');
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
		writePersistedBlockIdentityToShellAndProcessor(
			this.shellRoot,
			blockIndex,
			openLine,
		);
	}

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

	private currentBlockIndex(): number | null {
		return (
			parseBlockIndexAttr(this.shellRoot.getAttribute(ABC_BLOCK_INDEX_ATTR)) ??
			this.resolvedBlockIndex
		);
	}

	/** Read this block's fence body by stable index — never merge siblings. */
	private async readAbcForThisBlock(): Promise<string | null> {
		const blockIndex = this.currentBlockIndex();
		if (blockIndex === null) {
			return null;
		}

		const file = this.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
		if (!(file instanceof TFile)) {
			return null;
		}

		const markdown = await readNoteMarkdown(
			this.app,
			file,
			this.ctx.sourcePath,
			this.processorEl,
		);
		noteMarkdownForProbe(this.ctx.sourcePath, markdown);
		return readAbcBodyAtBlockIndex(markdown, blockIndex);
	}

	private pluginVersion(): string {
		return '0.1.5';
	}

	/**
	 * Initial LP open: processor `resolvedSource` can be wrong while shell attrs are
	 * already correct. Re-read by index only — never remap identity from DOM.
	 */
	private async bootstrapShell(): Promise<void> {
		const fromIndex = await this.readAbcForThisBlock();
		const initial =
			fromIndex !== null ? fromIndex : this.resolvedSource;
		this.mount(initial, 'bootstrap');
		this.mountSyncTestButton(initial);

		afterPreviewLayout(() => {
			void this.reconcileFromEditorByIndex('after-layout');
		});

		if (isEmptyAbcBlockSource(initial)) {
			window.setTimeout(() => {
				void this.reconcileFromEditorByIndex('empty-staff-delay');
			}, 200);
		}
	}

	/**
	 * Re-read fence body from the editor by `data-abc-block-index`.
	 * Runs even when DOM embed mapping is unreliable (inline sibling source edit).
	 */
	private applyDomIndexFromSnapshot(snapshot: LpEmbedSnapshot): void {
		const domIndex = domBlockIndexWhenReliable(snapshot);
		if (domIndex === null || domIndex === this.currentBlockIndex()) {
			return;
		}
		const openLine = openLineForAbcBlockIndex(snapshot.markdown, domIndex);
		if (openLine !== null) {
			this.persistBlockIdentity(openLine, domIndex);
		}
	}

	private async reconcileFromEditorByIndex(event: string): Promise<void> {
		const snapshot = buildLpEmbedSnapshot(
			this.app,
			this.processorEl,
			this.ctx.sourcePath,
		);
		if (snapshot) {
			this.applyDomIndexFromSnapshot(snapshot);
		}

		const resolved = await this.readAbcForThisBlock();
		if (resolved === null) {
			return;
		}

		this.mount(resolved, event);
		this.updateSyncTestButton(resolved);
	}

	/** Sync target: DOM embed index when reliable, else shell attrs (inline edit). */
	private buildSyncContext(): AbcBlockSyncContext {
		let blockIndex = this.currentBlockIndex();
		const snapshot = buildLpEmbedSnapshot(
			this.app,
			this.processorEl,
			this.ctx.sourcePath,
		);
		if (snapshot) {
			this.applyDomIndexFromSnapshot(snapshot);
			const domIndex = domBlockIndexWhenReliable(snapshot);
			if (domIndex !== null) {
				blockIndex = domIndex;
			}
		}

		const blockOpenLine =
			parseBlockOpenLineAttr(this.shellRoot.getAttribute(ABC_OPEN_LINE_ATTR)) ??
			this.resolvedBlockOpenLine;

		return {
			app: this.app,
			sourcePath: this.ctx.sourcePath,
			blockIndex,
			blockOpenLine,
			containingElement: this.processorEl,
		};
	}

	private async syncContext(): Promise<AbcBlockSyncContext> {
		const ctx = this.buildSyncContext();
		if (ctx.blockIndex === null) {
			new Notice('Abc block identity not resolved');
		}
		return ctx;
	}

	private mountSyncTestButton(sourceForEmptyCheck: string): void {
		const existing = this.shellRoot.querySelector('.abc-blocks-sync-test');
		if (existing) {
			existing.remove();
		}

		const row = this.shellRoot.createDiv({ cls: 'abc-blocks-sync-test' });
		const isEmpty = isEmptyAbcBlockSource(sourceForEmptyCheck);

		if (isEmpty) {
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

	private updateSyncTestButton(source: string): void {
		const row = this.shellRoot.querySelector('.abc-blocks-sync-test');
		if (!row) {
			this.mountSyncTestButton(source);
			return;
		}

		const isEmpty = isEmptyAbcBlockSource(source);
		const hasFirstEdit = row.querySelector('.abc-blocks-sync-test-btn')?.textContent?.includes(
			'4.3',
		);
		const hasWrite = row.querySelector('.abc-blocks-sync-test-btn')?.textContent?.includes('4.2');

		if ((isEmpty && hasFirstEdit) || (!isEmpty && hasWrite)) {
			return;
		}

		this.mountSyncTestButton(source);
	}

	private async handleSyncTestClick(): Promise<void> {
		const ctx = await this.syncContext();
		if (ctx.blockIndex === null) {
			return;
		}
		runPhase41SyncTest(ctx, this.syncScheduler);
	}

	private async handleFirstEditTestClick(): Promise<void> {
		const ctx = await this.syncContext();
		if (ctx.blockIndex === null) {
			return;
		}
		runPhase43FirstEditTest(ctx, this.syncScheduler);
	}

	private hasExpectedWidget(isEmpty: boolean): boolean {
		if (isEmpty) {
			return (
				this.containerEl.querySelector('[data-abc-empty-shell="true"]') !== null ||
				this.containerEl.querySelector('.abc-blocks-fallback') !== null
			);
		}
		return (
			this.containerEl.querySelector('[data-abc-rendered="true"]') !== null ||
			this.containerEl.querySelector('.abc-blocks-fallback') !== null
		);
	}

	private mount(source: string, event: string): void {
		const isEmpty = isEmptyAbcBlockSource(source);

		if (source === this.lastSource && this.hasExpectedWidget(isEmpty)) {
			this.recordProbe(source, event);
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
		this.recordProbe(source, event);
	}

	private recordProbe(source: string, event: string): void {
		recordPhase45ProbeShell(
			this.ctx.sourcePath,
			buildPhase45ProbeShell(
				this.shellRoot,
				this.containerEl,
				source,
				event,
				this.app,
				this.ctx.sourcePath,
				this.processorEl,
			),
		);
		schedulePhase45ProbeFlush(
			this.app,
			this.ctx.sourcePath,
			this.pluginVersion(),
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
	processorEl: HTMLElement,
	blockOpenLine: number | null,
	blockIndex: number | null = null,
	sectionInfo: AbcBlockSectionInfo | null = null,
	renderOrdinal = 0,
	ambiguousLineStarts: ReadonlySet<number> = new Set(),
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
			processorEl,
			app,
			ctx,
			resolvedSource,
			processorSource,
			sectionInfo,
			renderOrdinal,
			ambiguousLineStarts,
			blockOpenLine,
			blockIndex,
		),
	);
}
