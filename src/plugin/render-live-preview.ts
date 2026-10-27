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
import { SYNC_FAILURE_BLOCK_NOT_FOUND } from '../editor/error-copy';
import {
	ABC_SYNC_DEBOUNCE_MS,
	AbcSyncScheduler,
	type AbcBlockSyncContext,
} from '../editor/sync';

/** Live Preview child that keeps one ```abc block's staff in sync with the note. */
class AbcLivePreviewShell extends MarkdownRenderChild {
	private lastSource = '';
	private refreshTimer: number | null = null;
	private readonly syncScheduler = new AbcSyncScheduler();
	private resolvedBlockOpenLine: number | null;
	private resolvedBlockIndex: number | null;

	/** Remember which fence this shell belongs to and the source it was first given. */
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

	/** Draw the staff and refresh it when the user edits this note's markdown. */
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

	/** Flush a pending ABC write and cancel the refresh timer before the shell is removed. */
	onunload(): void {
		flushAbcSyncScheduler(this.syncScheduler);
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	/** Remember this fence's line and index on the shell so later refreshes hit the same block. */
	private persistBlockIdentity(openLine: number, blockIndex: number): void {
		this.resolvedBlockOpenLine = openLine;
		this.resolvedBlockIndex = blockIndex;
		writePersistedBlockIdentityToShellAndProcessor(
			this.shellRoot,
			blockIndex,
			openLine,
		);
	}

	/** Look up the opening fence line from the stored block index after the note text moves. */
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

	/** Block index from the DOM attribute, falling back to the index captured at mount. */
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

	/** Version string written into the dev probe so a stale Obsidian session can be detected. */
	private pluginVersion(): string {
		return '0.2.8';
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
	/** Adopt the visual embed index when it disagrees with the stored index and the mapping is trustworthy. */
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

	/** Re-read this fence from the editor and redraw if the markdown changed under us. */
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

	/** Sync target for writes, with a notice when this shell cannot tell which fence it is. */
	private async syncContext(): Promise<AbcBlockSyncContext> {
		const ctx = this.buildSyncContext();
		if (ctx.blockIndex === null) {
			new Notice(SYNC_FAILURE_BLOCK_NOT_FOUND);
		}
		return ctx;
	}

	/** True when the mount already shows the empty shell or a rendered staff, so we can skip a redraw. */
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

	/** Replace the staff when the fence text changed, and record a probe sample for tests. */
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

		mountEditorWidget(
			this.containerEl,
			source,
			isEmpty,
			{
				getSyncContext: () => this.syncContext(),
				scheduler: this.syncScheduler,
			},
			{ blockRoot: this.shellRoot },
		);
		this.recordProbe(source, event);
	}

	/** Snapshot this shell for the multi-block dev probe and schedule a debounced write. */
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

/** Mount the interactive editor for one ```abc fence inside Live Preview. */
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
