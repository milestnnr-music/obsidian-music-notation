/**
 * Phase 5: Live Preview root widget for ```abc blocks.
 * Phase 1.3 mounts this inside the interactive shell; Phase 2.1 renders ABC via abcjs.
 */
import type { NoteDuration, Score } from '../model/types';
import { EditorStateController } from './editor-state';
import { mountKeyTimeControls } from './key-time-controls';
import { mountToolbar } from './toolbar';
import { isEmptyAbcBlockSource } from '../plugin/block-source';
import { renderAbcToElementWhenReady } from '../renderer/abcjs-adapter';
import { mountFallbackUi } from '../ui/fallback';
import { getScoreMeasureCount } from '../ui/measure-warning';
import { mountMeasureWarning } from '../ui/measure-warning-ui';
import type { ScoreNoteRef } from './note-selection';
import {
	changeEventDurationInScore,
	parseSourceToScore,
	scoreToDisplayAbc,
} from './score-session';
import { annotateRenderedNotes } from './note-annotate';
import { attachStaffInteraction, type StaffInteractionOptions } from './staff-interaction';
import { scheduleScoreToAbcBlock, type AbcSyncScheduler, type AbcBlockSyncContext } from './sync';

export interface EditorWidgetSyncDeps {
	readonly getSyncContext: () => Promise<AbcBlockSyncContext>;
	readonly scheduler: AbcSyncScheduler;
}

export interface EditorWidgetMountOptions {
	readonly blockRoot?: HTMLElement;
}

const disposeByMount = new WeakMap<HTMLElement, () => void>();

export function mountEditorWidget(
	container: HTMLElement,
	source = '',
	isEmpty = isEmptyAbcBlockSource(source),
	sync?: EditorWidgetSyncDeps,
	mountOptions: EditorWidgetMountOptions = {},
): EditorStateController {
	disposeByMount.get(container)?.();
	disposeByMount.delete(container);

	container.empty();
	container.addClass('abc-blocks-editor-widget');

	const editorState = new EditorStateController();
	const toolbarMount = container.createDiv({ cls: 'abc-blocks-toolbar-mount' });

	const selectionBridge = {
		getSelection: (): ScoreNoteRef | null => null,
	};

	const measureWarningMount = container.createDiv({
		cls: 'abc-blocks-measure-warning-mount',
	});

	let currentScore = parseSourceToScore(source);
	let detachStaff: (() => void) | null = null;

	const commitScoreChange = (updated: Score): void => {
		if (updated === currentScore) {
			return;
		}
		currentScore = updated;
		renderStaff();
		if (!sync) {
			return;
		}
		void sync.getSyncContext().then((ctx) => {
			if (ctx.blockIndex === null) {
				return;
			}
			scheduleScoreToAbcBlock(sync.scheduler, ctx, updated);
		});
	};

	mountToolbar(toolbarMount, editorState, {
		getSelectedNoteRef: () => selectionBridge.getSelection(),
		onSelectedNoteDurationChange: (ref, duration: NoteDuration) => {
			commitScoreChange(
				changeEventDurationInScore(
					currentScore,
					ref.measureIndex,
					ref.eventIndex,
					duration,
				),
			);
		},
	});

	const refreshMeasureWarning = (): void => {
		mountMeasureWarning(measureWarningMount, getScoreMeasureCount(currentScore));
	};

	const staffMount = container.createDiv({ cls: 'abc-blocks-staff-mount' });
	const visualRoots = [container, mountOptions.blockRoot].filter(
		(root): root is HTMLElement => root instanceof HTMLElement,
	);

	const renderStaff = (): void => {
		refreshMeasureWarning();
		detachStaff?.();
		detachStaff = null;
		staffMount.empty();

		const abc = scoreToDisplayAbc(currentScore);
		void renderAbcToElementWhenReady(staffMount, abc).then((result) => {
			if (!result.ok) {
				mountFallbackUi(staffMount, abc);
				staffMount.removeAttribute('data-abc-rendered');
				return;
			}

			staffMount.setAttribute('data-abc-rendered', 'true');
			staffMount.removeAttribute('data-abc-render-error');

			const renderedSvg = staffMount.querySelector('svg');
			if (renderedSvg) {
				annotateRenderedNotes(renderedSvg, currentScore);
			}

			if (!sync) {
				return;
			}

			const interaction: StaffInteractionOptions = {
				getScore: () => currentScore,
				onScoreChange: commitScoreChange,
				editorState,
				getSyncContext: sync.getSyncContext,
				scheduler: sync.scheduler,
				visualRoots,
			};
			const staffHandle = attachStaffInteraction(staffMount, interaction);
			selectionBridge.getSelection = () => staffHandle.getSelection();
			detachStaff = () => {
				staffHandle.detach();
				selectionBridge.getSelection = () => null;
			};
		});
	};

	if (sync) {
		mountKeyTimeControls(toolbarMount, {
			getScore: () => currentScore,
			onScoreChange: (score: Score) => {
				currentScore = score;
				renderStaff();
			},
			getSyncContext: sync.getSyncContext,
			scheduler: sync.scheduler,
		});
	}

	disposeByMount.set(container, () => {
		detachStaff?.();
		detachStaff = null;
	});

	renderStaff();

	return editorState;
}
