import type { Accidental, NoteDuration } from '../model/types';
import type { ScoreNoteRef } from './note-selection';
import {
	type EditorAccidentalMode,
	type EditorStateController,
} from './editor-state';

export const DEFAULT_TOOLBAR_DURATION: NoteDuration = 'quarter';

const DURATION_CONTROLS: ReadonlyArray<{
	readonly duration: NoteDuration;
	readonly label: string;
	readonly title: string;
}> = [
	{ duration: 'whole', label: '𝅝', title: 'Whole note' },
	{ duration: 'half', label: '𝅗𝅥', title: 'Half note' },
	{ duration: 'quarter', label: '♩', title: 'Quarter note' },
	{ duration: 'eighth', label: '♪', title: 'Eighth note' },
];

const ACCIDENTAL_CONTROLS: ReadonlyArray<{
	readonly accidental: Accidental;
	readonly label: string;
	readonly title: string;
}> = [
	{ accidental: 'sharp', label: '♯', title: 'Sharp' },
	{ accidental: 'flat', label: '♭', title: 'Flat' },
	{ accidental: 'natural', label: '♮', title: 'Natural' },
];

export interface ToolbarSelectionDeps {
	readonly getSelectedNoteRef: () => ScoreNoteRef | null;
	/** Phase 5.4: change duration on the selected note and sync. */
	readonly onSelectedNoteDurationChange: (
		ref: ScoreNoteRef,
		duration: NoteDuration,
	) => void;
}

/** Phase 5.1: Duration and accidental toolbar controls. */
export function mountToolbar(
	container: HTMLElement,
	state: EditorStateController,
	selectionDeps?: ToolbarSelectionDeps,
): void {
	container.empty();
	container.addClass('abc-blocks-toolbar');

	const durationGroup = container.createDiv({
		cls: 'abc-blocks-toolbar-group',
		attr: { role: 'group', 'aria-label': 'Note duration' },
	});
	durationGroup.createSpan({
		cls: 'abc-blocks-toolbar-label',
		text: 'Duration',
	});

	const durationButtons = new Map<NoteDuration, HTMLButtonElement>();
	for (const { duration, label, title } of DURATION_CONTROLS) {
		const button = durationGroup.createEl('button', {
			cls: 'abc-blocks-toolbar-btn abc-blocks-toolbar-duration',
			text: label,
			attr: {
				type: 'button',
				title,
				'aria-label': title,
				'data-duration': duration,
			},
		});
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			const ref = selectionDeps?.getSelectedNoteRef() ?? null;
			if (ref && selectionDeps) {
				selectionDeps.onSelectedNoteDurationChange(ref, duration);
			}
			state.setDuration(duration);
		});
		durationButtons.set(duration, button);
	}

	const placementGroup = container.createDiv({
		cls: 'abc-blocks-toolbar-group',
		attr: { role: 'group', 'aria-label': 'Placement mode' },
	});
	placementGroup.createSpan({
		cls: 'abc-blocks-toolbar-label',
		text: 'Place',
	});

	const restButton = placementGroup.createEl('button', {
		cls: 'abc-blocks-toolbar-btn abc-blocks-toolbar-rest',
		text: '𝄽',
		attr: {
			type: 'button',
			title: 'Rest mode — click staff to place rests',
			'aria-label': 'Rest mode',
			'data-placement-mode': 'rest',
		},
	});
	restButton.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		state.toggleRestMode();
	});

	const accidentalGroup = container.createDiv({
		cls: 'abc-blocks-toolbar-group abc-blocks-toolbar-accidentals',
		attr: { role: 'group', 'aria-label': 'Accidental' },
	});
	accidentalGroup.createSpan({
		cls: 'abc-blocks-toolbar-label',
		text: 'Accidental',
	});

	const accidentalButtons = new Map<EditorAccidentalMode, HTMLButtonElement>();
	for (const { accidental, label, title } of ACCIDENTAL_CONTROLS) {
		const button = accidentalGroup.createEl('button', {
			cls: 'abc-blocks-toolbar-btn abc-blocks-toolbar-accidental',
			text: label,
			attr: {
				type: 'button',
				title,
				'aria-label': title,
				'data-accidental': accidental,
			},
		});
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			state.setAccidental(accidental);
		});
		accidentalButtons.set(accidental, button);
	}

	const syncActive = (editorState: ReturnType<EditorStateController['getState']>): void => {
		const restMode = editorState.placementMode === 'rest';
		container.toggleClass('abc-blocks-toolbar-rest-mode', restMode);
		accidentalGroup.toggleClass('abc-blocks-toolbar-group-disabled', restMode);

		for (const [duration, button] of durationButtons) {
			const active = editorState.duration === duration;
			button.toggleClass('abc-blocks-toolbar-btn-active', active);
			button.setAttr('aria-pressed', active ? 'true' : 'false');
		}

		restButton.toggleClass('abc-blocks-toolbar-btn-active', restMode);
		restButton.setAttr('aria-pressed', restMode ? 'true' : 'false');

		for (const [accidental, button] of accidentalButtons) {
			const active = editorState.accidental === accidental;
			button.toggleClass('abc-blocks-toolbar-btn-active', active);
			button.setAttr('aria-pressed', active ? 'true' : 'false');
			button.toggleClass('abc-blocks-toolbar-btn-disabled', restMode);
			button.disabled = restMode;
		}
	};

	syncActive(state.getState());
	state.subscribe(syncActive);
}
