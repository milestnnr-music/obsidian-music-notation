import type { Score } from '../model/types';
import type { AbcSyncScheduler, AbcBlockSyncContext } from './sync';
import { scheduleScoreToAbcBlock } from './sync';
import type { EditorStateController } from './editor-state';
import { verticalPosToPitch } from './pitch-hit-test';
import {
	findNoteElementAt,
	NoteSelectionController,
} from './note-selection';
import { snapPlacement } from './snap-grid';
import {
	applyToolbarAccidental,
	placeNoteInScore,
} from './score-session';

export interface StaffInteractionOptions {
	readonly getScore: () => Score;
	readonly onScoreChange: (score: Score) => void;
	readonly editorState: EditorStateController;
	readonly getSyncContext: () => Promise<AbcBlockSyncContext>;
	readonly scheduler: AbcSyncScheduler;
}

/** Phase 5.2: Snap grid place + Shift select on rendered staff. */
export function attachStaffInteraction(
	container: HTMLElement,
	options: StaffInteractionOptions,
): () => void {
	const selection = new NoteSelectionController();
	let guideEl: HTMLElement | null = null;

	const ensureGuide = (): HTMLElement => {
		if (!guideEl) {
			guideEl = container.createDiv({ cls: 'abc-blocks-snap-guide' });
		}
		return guideEl;
	};

	const hideGuide = (): void => {
		guideEl?.removeClass('abc-blocks-snap-guide-visible');
	};

	const showGuideAtClientY = (clientY: number, svg: SVGSVGElement): void => {
		const guide = ensureGuide();
		const svgRect = svg.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		// Anchor guide Y to the SVG viewport box (notation may scroll horizontally inside mount).
		const topInContainer =
			svgRect.top - containerRect.top + (clientY - svgRect.top);
		guide.setCssProps({ top: `${topInContainer}px` });
		guide.addClass('abc-blocks-snap-guide-visible');
	};

	const onMouseMove = (event: MouseEvent): void => {
		const svg = container.querySelector('svg');
		if (!svg) {
			hideGuide();
			selection.clearHover();
			return;
		}

		if (event.shiftKey) {
			hideGuide();
			const note = findNoteElementAt(event.clientX, event.clientY, svg);
			selection.setHoverNote(note);
			container.addClass('abc-blocks-staff-selecting');
			return;
		}

		container.removeClass('abc-blocks-staff-selecting');
		selection.clearHover();

		const snap = snapPlacement(svg, event.clientX, event.clientY);
		if (!snap) {
			hideGuide();
			return;
		}

		showGuideAtClientY(snap.guideClientY, svg);
	};

	const onMouseLeave = (): void => {
		hideGuide();
		selection.clearHover();
		container.removeClass('abc-blocks-staff-selecting');
	};

	const onClick = (event: Event): void => {
		if (!(event instanceof MouseEvent) || event.button !== 0) {
			return;
		}

		const svg = container.querySelector('svg');
		if (!svg) {
			return;
		}

		if (event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();

			const note = findNoteElementAt(event.clientX, event.clientY, svg);
			if (note) {
				selection.selectNote(note);
			} else {
				selection.clearSelection();
			}
			return;
		}

		const snap = snapPlacement(svg, event.clientX, event.clientY);
		if (!snap) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		selection.clearSelection();

		const toolbar = options.editorState.getState();
		const pitch = applyToolbarAccidental(
			verticalPosToPitch(snap.verticalPos),
			toolbar.accidental,
		);

		const updated = placeNoteInScore(
			options.getScore(),
			snap.measureIndex,
			pitch,
			toolbar.duration,
		);

		options.onScoreChange(updated);

		void options.getSyncContext().then((ctx) => {
			if (ctx.blockIndex === null) {
				return;
			}
			scheduleScoreToAbcBlock(options.scheduler, ctx, updated);
		});
	};

	container.addClass('abc-blocks-staff-interactive');
	container.addEventListener('mousemove', onMouseMove);
	container.addEventListener('mouseleave', onMouseLeave);
	container.addEventListener('click', onClick);

	return () => {
		container.removeEventListener('mousemove', onMouseMove);
		container.removeEventListener('mouseleave', onMouseLeave);
		container.removeEventListener('click', onClick);
		container.removeClass('abc-blocks-staff-interactive');
		container.removeClass('abc-blocks-staff-selecting');
		hideGuide();
		guideEl?.remove();
		guideEl = null;
		selection.dispose();
	};
}
