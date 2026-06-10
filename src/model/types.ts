/** Clefs supported in v1 (treble only); v2 adds bass and others. */
export type Clef = 'treble';

export type Accidental = 'sharp' | 'flat' | 'natural';

/** Diatonic steps used in v1 (treble, single pitch). */
export type PitchStep = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type NoteDuration =
	| 'whole'
	| 'half'
	| 'quarter'
	| 'eighth';

export interface Pitch {
	readonly step: PitchStep;
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

/** v1 parse warnings for deferred notation (Phase 3.6). */
export type AbcParseWarningKind = 'chord' | 'multi-staff' | 'unsupported';

export interface AbcParseWarning {
	readonly kind: AbcParseWarningKind;
	readonly message: string;
}

export interface AbcParseResult {
	readonly score: Score | null;
	readonly warnings: readonly AbcParseWarning[];
}
