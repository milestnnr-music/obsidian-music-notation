import type { NoteDuration, Score } from '../model/types';
import { EditorStateController } from './editor-state';
import { mountKeyTimeControls } from './key-time-controls';
import { mountToolbar } from './toolbar';
import { isEmptyAbcBlockSource } from '../plugin/block-source';
import { ABC_FALLBACK_MESSAGE, friendlyAbcRenderError } from './error-copy';
import { renderAbcToElementWhenReady } from '../renderer/abcjs-adapter';
import { abcSourceHasUnsupportedSymbols } from '../renderer/abc-render-validity';
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

/** Build the Live Preview editor: toolbar, warning, and staff, and keep them tied to one score. */
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

	/** Store an edited score, redraw the staff, and debounce a write back to the fence. */
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
		/** Rewrite the selected note or rest to the duration the user just picked. */
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

	/** Refresh the measure-count banner from the score currently on screen. */
	const refreshMeasureWarning = (): void => {
		mountMeasureWarning(measureWarningMount, getScoreMeasureCount(currentScore));
	};

	const staffMount = container.createDiv({ cls: 'abc-blocks-staff-mount' });
	const visualRoots = [container, mountOptions.blockRoot].filter(
		(root): root is HTMLElement => root instanceof HTMLElement,
	);

	/** Draw the staff from the score, or a fallback when the source has symbols we cannot edit. */
	const renderStaff = (): void => {
		refreshMeasureWarning();
		detachStaff?.();
		detachStaff = null;
		staffMount.empty();

		if (!isEmpty && abcSourceHasUnsupportedSymbols(source)) {
			mountFallbackUi(staffMount, source);
			staffMount.removeAttribute('data-abc-rendered');
			staffMount.setAttribute(
				'data-abc-render-error',
				friendlyAbcRenderError(ABC_FALLBACK_MESSAGE),
			);
			return;
		}

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
			/** Keep the on-screen score in step with a key or time change, then redraw. */
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
