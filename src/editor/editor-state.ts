import type { Accidental, NoteDuration } from '../model/types';
import { ABC_DEFAULTS } from '../serializer/abc-defaults';

/** No accidental override — pitch follows the key signature. */
export type EditorAccidentalMode = Accidental | 'none';

export type EditorPlacementMode = 'note' | 'rest';

export interface ScoreEditorState {
	readonly duration: NoteDuration;
	readonly accidental: EditorAccidentalMode;
	readonly placementMode: EditorPlacementMode;
}

export type EditorStateChangeListener = (state: ScoreEditorState) => void;

/** Starting toolbar state: quarter notes, no accidental, and note (not rest) placement. */
export function createDefaultEditorState(): ScoreEditorState {
	return {
		duration: ABC_DEFAULTS.defaultNoteDuration,
		accidental: 'none',
		placementMode: 'note',
	};
}

/** Holds the toolbar choices for one block and notifies the staff when they change. */
export class EditorStateController {
	private state: ScoreEditorState;
	private readonly listeners = new Set<EditorStateChangeListener>();

	/** Start from the default toolbar state, or a snapshot supplied by a test. */
	constructor(initial: ScoreEditorState = createDefaultEditorState()) {
		this.state = initial;
	}

	/** Current duration, accidental, and placement mode for staff clicks and the toolbar. */
	getState(): ScoreEditorState {
		return this.state;
	}

	/** Select the duration used for the next placed note and for a selected note's rewrite. */
	setDuration(duration: NoteDuration): void {
		if (this.state.duration === duration) {
			return;
		}
		this.state = { ...this.state, duration };
		this.notify();
	}

	/** Clicking the active accidental clears it; otherwise selects the new mode. */
	setAccidental(accidental: EditorAccidentalMode): void {
		const next =
			accidental !== 'none' && this.state.accidental === accidental
				? 'none'
				: accidental;
		if (this.state.accidental === next) {
			return;
		}
		this.state = { ...this.state, accidental: next };
		this.notify();
	}

	/** Toggle note vs rest placement on the staff. */
	setPlacementMode(placementMode: EditorPlacementMode): void {
		if (this.state.placementMode === placementMode) {
			return;
		}
		this.state = { ...this.state, placementMode };
		this.notify();
	}

	/** Switch between placing notes and placing rests from the rest button. */
	toggleRestMode(): void {
		const next: EditorPlacementMode =
			this.state.placementMode === 'rest' ? 'note' : 'rest';
		this.setPlacementMode(next);
	}

	/** Listen for toolbar changes; the returned function removes that listener. */
	subscribe(listener: EditorStateChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/** Tell every listener the latest state so buttons and the staff stay in sync. */
	private notify(): void {
		const snapshot = this.state;
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}
}
