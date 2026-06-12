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

export function createDefaultEditorState(): ScoreEditorState {
	return {
		duration: ABC_DEFAULTS.defaultNoteDuration,
		accidental: 'none',
		placementMode: 'note',
	};
}

/** Mutable per-block editor chrome state (toolbar selection until staff interaction in 5.2+). */
export class EditorStateController {
	private state: ScoreEditorState;
	private readonly listeners = new Set<EditorStateChangeListener>();

	constructor(initial: ScoreEditorState = createDefaultEditorState()) {
		this.state = initial;
	}

	getState(): ScoreEditorState {
		return this.state;
	}

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

	toggleRestMode(): void {
		const next: EditorPlacementMode =
			this.state.placementMode === 'rest' ? 'note' : 'rest';
		this.setPlacementMode(next);
	}

	subscribe(listener: EditorStateChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify(): void {
		const snapshot = this.state;
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}
}
