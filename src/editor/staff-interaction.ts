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
import type { ScoreNoteRef } from './note-selection';
import {
	applyToolbarAccidental,
	deleteNoteFromScore,
	placeNoteInScore,
	placeRestInScore,
} from './score-session';

export interface StaffInteractionOptions {
	readonly getScore: () => Score;
	readonly onScoreChange: (score: Score) => void;
	readonly editorState: EditorStateController;
	readonly getSyncContext: () => Promise<AbcBlockSyncContext>;
	readonly scheduler: AbcSyncScheduler;
	/** Roots searched when stripping selection/hover marks (editor widget + LP shell). */
	readonly visualRoots?: readonly HTMLElement[];
}

/** True for Delete or Backspace, the keys that remove the selected note. */
function isDeleteKey(event: KeyboardEvent): boolean {
	return event.key === 'Delete' || event.key === 'Backspace';
}

/** DOM roots that may still hold selection marks after abcjs replaces the SVG. */
function collectVisualRoots(
	container: HTMLElement,
	visualRoots?: readonly HTMLElement[],
): ParentNode[] {
	const roots: ParentNode[] = [container];
	for (const root of visualRoots ?? []) {
		if (!roots.includes(root)) {
			roots.push(root);
		}
	}
	const notation = container.querySelector('.abc-blocks-notation');
	if (notation && !roots.includes(notation)) {
		roots.push(notation);
	}
	return roots;
}

/** Staff + editor chrome (toolbar) — do not dismiss selection on pointer/focus here (5.4). */
export function isInsideSelectionPreserveArea(
	node: Node,
	staffContainer: HTMLElement,
	visualRoots?: readonly HTMLElement[],
): boolean {
	if (staffContainer.contains(node)) {
		return true;
	}
	for (const root of visualRoots ?? []) {
		if (root.contains(node)) {
			return true;
		}
	}
	return false;
}

export interface StaffInteractionHandle {
	readonly detach: () => void;
	readonly getSelection: () => ScoreNoteRef | null;
}

/** Wire click, hover, and delete on a rendered staff so notes can be placed, selected, and removed. */
export function attachStaffInteraction(
	container: HTMLElement,
	options: StaffInteractionOptions,
): StaffInteractionHandle {
	const visualRoots = collectVisualRoots(container, options.visualRoots);
	const selection = new NoteSelectionController(visualRoots);
	const ownerDocument = container.ownerDocument;
	let guideEl: HTMLElement | null = null;

	container.setAttribute('tabindex', '-1');

	/** Apply a score edit and queue a debounced write back to this block's fence. */
	const commitScoreChange = (updated: Score): void => {
		options.onScoreChange(updated);
		void options.getSyncContext().then((ctx) => {
			if (ctx.blockIndex === null) {
				return;
			}
			scheduleScoreToAbcBlock(options.scheduler, ctx, updated);
		});
	};

	/** Remove the selected event and clear marks so a redraw does not leave a stale highlight. */
	const deleteSelectedNote = (ref: ScoreNoteRef): void => {
		const updated = deleteNoteFromScore(
			options.getScore(),
			ref.measureIndex,
			ref.eventIndex,
		);
		if (updated === options.getScore()) {
			return;
		}
		selection.clearAllVisualState();
		commitScoreChange(updated);
	};

	/** Create the horizontal snap line the first time the pointer moves over the staff. */
	const ensureGuide = (): HTMLElement => {
		if (!guideEl) {
			guideEl = container.createDiv({ cls: 'abc-blocks-snap-guide' });
		}
		return guideEl;
	};

	/** Hide the snap line when the pointer leaves the staff or Shift-select starts. */
	const hideGuide = (): void => {
		guideEl?.removeClass('abc-blocks-snap-guide-visible');
	};

	/** Place the snap line on the pitch row under the pointer, in the staff container's coordinates. */
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

	/** Hover a note while Shift is held; otherwise show the pitch snap line. */
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

	/** Clear the snap line and hover when the pointer leaves the staff. */
	const onMouseLeave = (): void => {
		hideGuide();
		selection.clearHover();
		container.removeClass('abc-blocks-staff-selecting');
	};

	/** Shift-click selects a note; a normal click places a note or rest at the snapped pitch. */
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
				container.focus();
			} else {
				selection.clearAllVisualState();
			}
			return;
		}

		const snap = snapPlacement(svg, event.clientX, event.clientY);
		if (!snap) {
			selection.clearAllVisualState();
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		selection.clearAllVisualState();

		const toolbar = options.editorState.getState();

		const updated =
			toolbar.placementMode === 'rest'
				? placeRestInScore(
						options.getScore(),
						snap.measureIndex,
						toolbar.duration,
					)
				: placeNoteInScore(
						options.getScore(),
						snap.measureIndex,
						applyToolbarAccidental(
							verticalPosToPitch(snap.verticalPos),
							toolbar.accidental,
						),
						toolbar.duration,
					);

		container.focus();
		commitScoreChange(updated);
	};

	/** Clear selection when focus or the pointer moves outside the editor chrome. */
	const dismissSelection = (): void => {
		selection.clearAllVisualState();
	};

	/** Stop abcjs from painting a clicked note red; we draw our own selection instead. */
	const blockAbcjsNoteHighlight = (event: Event): void => {
		const svg = container.querySelector('svg');
		const target = event.target;
		if (!svg || !(target instanceof Node) || !svg.contains(target)) {
			return;
		}
		event.stopPropagation();
	};

	/** Deselect when the user clicks outside the staff and toolbar. */
	const onDocumentPointerDown = (event: PointerEvent): void => {
		const target = event.target;
		if (
			target instanceof Node &&
			isInsideSelectionPreserveArea(target, container, options.visualRoots)
		) {
			return;
		}
		dismissSelection();
	};

	/** Deselect when keyboard focus leaves the staff, unless it moved into the toolbar. */
	const onFocusOut = (event: FocusEvent): void => {
		const related = event.relatedTarget;
		if (
			related instanceof Node &&
			isInsideSelectionPreserveArea(related, container, options.visualRoots)
		) {
			return;
		}
		dismissSelection();
	};

	/** Delete or Backspace removes the selected note while the staff has focus. */
	const onKeyDown = (event: KeyboardEvent): void => {
		if (!isDeleteKey(event)) {
			return;
		}

		const ref = selection.getSelection();
		if (!ref) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		deleteSelectedNote(ref);
	};

	/** Mark the staff when rest mode is on so the cursor hint matches the toolbar. */
	const syncPlacementModeClass = (): void => {
		const restMode = options.editorState.getState().placementMode === 'rest';
		container.toggleClass('abc-blocks-staff-rest-mode', restMode);
	};
	syncPlacementModeClass();
	const unsubscribePlacement = options.editorState.subscribe(syncPlacementModeClass);

	container.addClass('abc-blocks-staff-interactive');
	container.addEventListener('mousemove', onMouseMove);
	container.addEventListener('mouseleave', onMouseLeave);
	container.addEventListener('click', onClick);
	container.addEventListener('keydown', onKeyDown);
	container.addEventListener('focusout', onFocusOut);
	container.addEventListener('mousedown', blockAbcjsNoteHighlight, true);
	container.addEventListener('mouseup', blockAbcjsNoteHighlight, true);
	container.addEventListener('touchstart', blockAbcjsNoteHighlight, true);
	container.addEventListener('touchend', blockAbcjsNoteHighlight, true);
	ownerDocument.addEventListener('pointerdown', onDocumentPointerDown, true);

	/** Remove listeners and marks when the staff is about to be redrawn. */
	const detach = (): void => {
		unsubscribePlacement();
		container.removeEventListener('mousemove', onMouseMove);
		container.removeEventListener('mouseleave', onMouseLeave);
		container.removeEventListener('click', onClick);
		container.removeEventListener('keydown', onKeyDown);
		container.removeEventListener('focusout', onFocusOut);
		container.removeEventListener('mousedown', blockAbcjsNoteHighlight, true);
		container.removeEventListener('mouseup', blockAbcjsNoteHighlight, true);
		container.removeEventListener('touchstart', blockAbcjsNoteHighlight, true);
		container.removeEventListener('touchend', blockAbcjsNoteHighlight, true);
		ownerDocument.removeEventListener('pointerdown', onDocumentPointerDown, true);
		container.removeAttribute('tabindex');
		container.removeClass('abc-blocks-staff-interactive');
		container.removeClass('abc-blocks-staff-selecting');
		container.removeClass('abc-blocks-staff-rest-mode');
		hideGuide();
		guideEl?.remove();
		guideEl = null;
		selection.dispose();
	};

	return {
		detach,
		getSelection: () => selection.getSelection(),
	};
}
