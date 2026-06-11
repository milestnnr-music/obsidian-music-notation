/**
 * Phase 5: Live Preview root widget for ```abc blocks.
 * Phase 1.3 mounts this inside the interactive shell; Phase 2.1 renders ABC via abcjs.
 */
import type { Score } from '../model/types';
import { EditorStateController } from './editor-state';
import { mountKeyTimeControls } from './key-time-controls';
import { mountToolbar } from './toolbar';
import { isEmptyAbcBlockSource } from '../plugin/block-source';
import { renderAbcToElementWhenReady } from '../renderer/abcjs-adapter';
import { mountFallbackUi } from '../ui/fallback';
import { getScoreMeasureCount } from '../ui/measure-warning';
import { mountMeasureWarning } from '../ui/measure-warning-ui';
import {
	parseSourceToScore,
	scoreToDisplayAbc,
} from './score-session';
import { annotateRenderedNotes } from './note-annotate';
import { attachStaffInteraction, type StaffInteractionOptions } from './staff-interaction';
import type { AbcSyncScheduler, AbcBlockSyncContext } from './sync';

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
	mountToolbar(toolbarMount, editorState);

	const measureWarningMount = container.createDiv({
		cls: 'abc-blocks-measure-warning-mount',
	});

	let currentScore = parseSourceToScore(source);
	let detachStaff: (() => void) | null = null;

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
				onScoreChange: (score: Score) => {
					currentScore = score;
					renderStaff();
				},
				editorState,
				getSyncContext: sync.getSyncContext,
				scheduler: sync.scheduler,
				visualRoots,
			};
			detachStaff = attachStaffInteraction(staffMount, interaction);
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
