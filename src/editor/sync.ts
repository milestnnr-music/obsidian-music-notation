import {
	MarkdownView,
	TFile,
	type App,
	type Editor,
	type EditorPosition,
} from 'obsidian';
import {
	SYNC_FAILURE_BLOCK_NOT_FOUND,
	SYNC_FAILURE_NOTE_NOT_FOUND,
} from './error-copy';
import type { Score } from '../model/types';
import { writeAbc } from '../serializer/abc-writer';
import { parseAbc } from '../serializer/abc-parser';
import { createEmptyScore, scoreHasEvents } from '../model/score';
import {
	findMarkdownViewContaining,
	isEmptyAbcBlockSource,
} from '../plugin/block-source';
import {
	extractAbcBlockBodyAtOpenLine,
	findAbcBlockFenceRange,
	isAbcBlockBodyEmpty,
	openLineForAbcBlockIndex,
	replaceAbcBlockBodyInMarkdown,
	type AbcBlockFenceRange,
} from './abc-block-patch';

export const ABC_SYNC_DEBOUNCE_MS = 300;

export interface AbcBlockSyncContext {
	readonly app: App;
	readonly sourcePath: string;
	/** Opening ```abc fence line in the note (0-based). */
	readonly blockOpenLine: number | null;
	/** 0-based index among ```abc fences — authoritative for sync target. */
	readonly blockIndex: number | null;
	/** LP shell / processor element — scopes editor read-write to the correct leaf. */
	readonly containingElement?: HTMLElement;
}

export type AbcSyncResult =
	| { readonly ok: true; readonly abcBody: string }
	| { readonly ok: false; readonly reason: string };

export type AbcSyncCallback = () => void | Promise<void>;

export interface AbcSyncSchedulerDeps {
	readonly delayMs: number;
	readonly setTimer: (fn: () => void, ms: number) => number;
	readonly clearTimer: (id: number) => void;
}

function defaultSchedulerDeps(): AbcSyncSchedulerDeps {
	return {
		delayMs: ABC_SYNC_DEBOUNCE_MS,
		setTimer: (fn, ms) => window.setTimeout(fn, ms),
		clearTimer: (id) => window.clearTimeout(id),
	};
}

/**
 * Phase 4.2: Per-block debounced sync. Rapid `schedule` calls coalesce into one
 * write after `ABC_SYNC_DEBOUNCE_MS`. Call `flush` on unmount to persist pending edits.
 */
export class AbcSyncScheduler {
	private timer: number | null = null;
	private pending: AbcSyncCallback | null = null;
	private readonly deps: AbcSyncSchedulerDeps;

	constructor(deps: Partial<AbcSyncSchedulerDeps> = {}) {
		this.deps = { ...defaultSchedulerDeps(), ...deps };
	}

	schedule(callback: AbcSyncCallback): void {
		this.pending = callback;
		this.clearTimer();
		this.timer = this.deps.setTimer(() => {
			this.timer = null;
			const fn = this.pending;
			this.pending = null;
			void fn?.();
		}, this.deps.delayMs);
	}

	cancel(): void {
		this.clearTimer();
		this.pending = null;
	}

	flush(): void {
		this.clearTimer();
		const fn = this.pending;
		this.pending = null;
		void fn?.();
	}

	hasPending(): boolean {
		return this.pending !== null;
	}

	private clearTimer(): void {
		if (this.timer !== null) {
			this.deps.clearTimer(this.timer);
			this.timer = null;
		}
	}
}

/** Schedule a debounced sync callback on the given block scheduler. */
export function scheduleAbcSync(
	scheduler: AbcSyncScheduler,
	callback: AbcSyncCallback,
): void {
	scheduler.schedule(callback);
}

/** Serialize a Score to ABC fence body text (headers + music lines). */
export function scoreToAbcBody(score: Score): string {
	return writeAbc(score);
}

/**
 * Phase 4.1: Apply a Score to the matching ```abc block in the note.
 * Prefers the open editor buffer; falls back to vault.modify.
 */
export async function applyScoreToAbcBlock(
	ctx: AbcBlockSyncContext,
	score: Score,
): Promise<AbcSyncResult> {
	return applyAbcBodyToDocument(ctx, scoreToAbcBody(score));
}

/** True when the fence body in markdown is empty or whitespace-only. */
export function isAbcBlockEmptyInMarkdown(
	markdown: string,
	blockOpenLine: number | null,
): boolean {
	if (blockOpenLine === null) {
		return true;
	}

	const body = extractAbcBlockBodyAtOpenLine(markdown, blockOpenLine);
	if (body === null) {
		return true;
	}

	return isEmptyAbcBlockSource(body);
}

export async function isAbcBlockEmptyInDocument(
	ctx: AbcBlockSyncContext,
): Promise<boolean> {
	const file = ctx.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) {
		return true;
	}

	const editor = findMarkdownEditorForPath(
		ctx.app,
		ctx.sourcePath,
		ctx.containingElement,
	);
	const markdown = editor
		? editor.getValue()
		: await ctx.app.vault.read(file);

	return isAbcBlockEmptyInMarkdown(
		markdown,
		resolveSyncBlockOpenLine(markdown, ctx),
	);
}

/**
 * Phase 4.3: Sync score → markdown. Empty fences stay empty until the score
 * has events (first edit); then headers + body are written.
 */
export async function syncScoreToAbcBlock(
	ctx: AbcBlockSyncContext,
	score: Score,
): Promise<AbcSyncResult> {
	const fenceEmpty = await isAbcBlockEmptyInDocument(ctx);

	if (fenceEmpty && !scoreHasEvents(score)) {
		return { ok: true, abcBody: '' };
	}

	return applyScoreToAbcBlock(ctx, score);
}

/**
 * Phase 4.2/4.3: Debounced Score → markdown write for a single block.
 */
export function scheduleScoreToAbcBlock(
	scheduler: AbcSyncScheduler,
	ctx: AbcBlockSyncContext,
	score: Score,
	onComplete?: (result: AbcSyncResult) => void,
): void {
	scheduleAbcSync(scheduler, async () => {
		const result = await syncScoreToAbcBlock(ctx, score);
		onComplete?.(result);
	});
}

/**
 * Phase 4.1: Write ABC text into the fence body for the block at `blockOpenLine`.
 */
export async function applyAbcBodyToDocument(
	ctx: AbcBlockSyncContext,
	abcBody: string,
): Promise<AbcSyncResult> {
	const file = ctx.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) {
		return { ok: false, reason: SYNC_FAILURE_NOTE_NOT_FOUND };
	}

	const editor = findMarkdownEditorForPath(
		ctx.app,
		ctx.sourcePath,
		ctx.containingElement,
	);
	if (editor) {
		const blockOpenLine = resolveSyncBlockOpenLine(editor.getValue(), ctx);
		if (blockOpenLine === null) {
			return { ok: false, reason: SYNC_FAILURE_BLOCK_NOT_FOUND };
		}
		return applyAbcBodyViaEditor(editor, blockOpenLine, abcBody);
	}

	const markdown = await ctx.app.vault.read(file);
	const blockOpenLine = resolveSyncBlockOpenLine(markdown, ctx);
	if (blockOpenLine === null) {
		return { ok: false, reason: SYNC_FAILURE_BLOCK_NOT_FOUND };
	}
	const updated = replaceAbcBlockBodyInMarkdown(
		markdown,
		blockOpenLine,
		abcBody,
	);
	if (updated === null) {
		return { ok: false, reason: SYNC_FAILURE_BLOCK_NOT_FOUND };
	}

	await ctx.app.vault.modify(file, updated);
	return { ok: true, abcBody };
}

function applyAbcBodyViaEditor(
	editor: Editor,
	blockOpenLine: number | null,
	abcBody: string,
): AbcSyncResult {
	const markdown = editor.getValue();
	const range = findAbcBlockFenceRange(markdown, blockOpenLine);
	if (!range) {
		return { ok: false, reason: SYNC_FAILURE_BLOCK_NOT_FOUND };
	}

	const editRange = getAbcBlockBodyEditRange(editor, range);
	const bodyToWrite = abcBody.replace(/\n$/, '');
	editor.replaceRange(bodyToWrite, editRange.from, editRange.to);
	return { ok: true, abcBody };
}

function getAbcBlockBodyEditRange(
	editor: Editor,
	range: AbcBlockFenceRange,
): { from: EditorPosition; to: EditorPosition } {
	const from: EditorPosition = { line: range.bodyStartLine, ch: 0 };

	if (isAbcBlockBodyEmpty(range)) {
		return { from, to: from };
	}

	const endLine = range.bodyEndLine;
	const endCh = (editor.getLine(endLine) ?? '').length;
	return { from, to: { line: endLine, ch: endCh } };
}

/** Re-derive fence open line from block index against fresh markdown. */
export function resolveSyncBlockOpenLine(
	markdown: string,
	ctx: AbcBlockSyncContext,
): number | null {
	if (ctx.blockIndex !== null) {
		return openLineForAbcBlockIndex(markdown, ctx.blockIndex);
	}
	return ctx.blockOpenLine;
}

function findMarkdownEditorForPath(
	app: App,
	sourcePath: string,
	containingElement?: HTMLElement,
): Editor | null {
	if (containingElement) {
		const view = findMarkdownViewContaining(app, sourcePath, containingElement);
		if (view?.editor) {
			return view.editor;
		}
	}

	const active = app.workspace.activeEditor;
	if (active?.file?.path === sourcePath && active.editor) {
		return active.editor;
	}

	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (activeView?.file?.path === sourcePath && activeView.editor) {
		return activeView.editor;
	}

	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === sourcePath) {
			return view.editor ?? null;
		}
	}

	return null;
}

/** Sample score for manual sync testing (DESIGN.md example). */
export function createPhase41TestScore(): Score {
	const sample = `X:1
M:4/4
L:1/4
K:C
CDEF|GABc|`;
	const parsed = parseAbc(sample);
	return parsed.score ?? createEmptyScore();
}
