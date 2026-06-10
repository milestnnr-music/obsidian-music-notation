/** Clefs supported in v1 (treble only); v2 adds bass and others. */
export type Clef = 'treble';

export type Accidental = 'sharp' | 'flat' | 'natural';

export type NoteDuration =
	| 'whole'
	| 'half'
	| 'quarter'
	| 'eighth';

export interface Pitch {
	readonly step: string;
	readonly octave: number;
	readonly accidental?: Accidental;
}

export interface NoteEvent {
	readonly kind: 'note';
	readonly pitches: readonly Pitch[];
	readonly duration: NoteDuration;
}

export interface RestEvent {
	readonly kind: 'rest';
	readonly duration: NoteDuration;
}

export type MeasureEvent = NoteEvent | RestEvent;

export interface Measure {
	readonly events: readonly MeasureEvent[];
}

export interface Staff {
	readonly clef: Clef;
	readonly measures: readonly Measure[];
}

export interface Score {
	readonly timeSignature: string;
	readonly keySignature: string;
	readonly defaultNoteDuration: NoteDuration;
	readonly staves: readonly Staff[];
}
