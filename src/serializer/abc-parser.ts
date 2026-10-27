import type {
	AbcParseResult,
	AbcParseWarning,
	Measure,
	MeasureEvent,
	NoteDuration,
	NoteEvent,
	Score,
	Staff,
} from '../model/types';
import { ABC_DEFAULTS } from './abc-defaults';
import {
	abcLToDefaultDuration,
	abcSuffixToDuration,
	parseAbcDurationSuffix,
	parseAbcPitch,
} from './abc-mapping';

/** Parse fence ABC into a score plus warnings, used when loading a block into the editor. */
export function parseAbc(abc: string): AbcParseResult {
	const warnings: AbcParseWarning[] = [];
	const lines = abc
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return { score: null, warnings };
	}

	let timeSignature: string = ABC_DEFAULTS.timeSignature;
	let keySignature: string = ABC_DEFAULTS.keySignature;
	let defaultNoteDuration: NoteDuration = ABC_DEFAULTS.defaultNoteDuration;
	const musicLines: string[] = [];
	let voiceIndex = 0;

	for (const line of lines) {
		if (line.startsWith('X:')) {
			continue;
		}
		if (line.startsWith('M:')) {
			timeSignature = line.slice(2).trim();
			continue;
		}
		if (line.startsWith('L:')) {
			defaultNoteDuration = abcLToDefaultDuration(line.slice(2));
			continue;
		}
		if (line.startsWith('K:')) {
			keySignature = line.slice(2).trim();
			continue;
		}
		if (line.startsWith('V:')) {
			if (voiceIndex > 0) {
				pushWarning(
					warnings,
					'multi-staff',
					'Multiple ABC voices detected; using the first voice only.',
				);
			}
			voiceIndex++;
			continue;
		}
		if (line.startsWith('%%staves')) {
			pushWarning(
				warnings,
				'multi-staff',
				'Multi-staff layout detected; using the first staff only.',
			);
			continue;
		}
		if (line.startsWith('%%')) {
			continue;
		}

		if (voiceIndex <= 1) {
			musicLines.push(line);
		}
	}

	if (musicLines.length === 0) {
		return {
			score: createScore(timeSignature, keySignature, defaultNoteDuration, []),
			warnings,
		};
	}

	const body = musicLines.join('');
	const measures = parseMeasures(body, defaultNoteDuration, warnings);

	return {
		score: createScore(timeSignature, keySignature, defaultNoteDuration, measures),
		warnings,
	};
}

/** Assemble the v1 score: one treble staff, keeping an empty measure when the body has no bars. */
function createScore(
	timeSignature: string,
	keySignature: string,
	defaultNoteDuration: Score['defaultNoteDuration'],
	measures: Measure[],
): Score {
	const staff: Staff = {
		clef: 'treble',
		measures: measures.length > 0 ? measures : [{ events: [] }],
	};

	return {
		timeSignature,
		keySignature,
		defaultNoteDuration,
		staves: [staff],
	};
}

/** Split a music line on bar lines and parse each measure's notes and rests. */
function parseMeasures(
	body: string,
	defaultNoteDuration: Score['defaultNoteDuration'],
	warnings: AbcParseWarning[],
): Measure[] {
	const rawMeasures = body.split('|').filter((segment) => segment.length > 0);
	return rawMeasures.map((segment) => ({
		events: parseMeasureEvents(segment, defaultNoteDuration, warnings),
	}));
}

/** Walk one measure left to right, skipping whitespace and recording unsupported symbols as warnings. */
function parseMeasureEvents(
	segment: string,
	defaultNoteDuration: Score['defaultNoteDuration'],
	warnings: AbcParseWarning[],
): MeasureEvent[] {
	const events: MeasureEvent[] = [];
	let i = 0;

	while (i < segment.length) {
		const char = segment[i];
		if (!char || /\s/.test(char)) {
			i++;
			continue;
		}

		if (char === '[') {
			const chordResult = parseChord(segment, i, defaultNoteDuration, warnings);
			if (chordResult) {
				events.push(chordResult.event);
				i += chordResult.consumed;
				continue;
			}
			pushWarning(warnings, 'unsupported', 'Unrecognized chord notation; skipping.');
			i++;
			continue;
		}

		if (char === 'z') {
			const rest = parseRest(segment, i, defaultNoteDuration);
			if (rest) {
				events.push(rest.event);
				i += rest.consumed;
				continue;
			}
		}

		const note = parseNote(segment, i, defaultNoteDuration);
		if (note) {
			events.push(note.event);
			i += note.consumed;
			continue;
		}

		pushWarning(
			warnings,
			'unsupported',
			`Skipping unrecognized symbol "${char}" in measure.`,
		);
		i++;
	}

	return events;
}

/** Read one pitch and its duration suffix, used for ordinary notes (not chords or rests). */
function parseNote(
	source: string,
	index: number,
	defaultNoteDuration: Score['defaultNoteDuration'],
): { event: NoteEvent; consumed: number } | null {
	const pitchResult = parseAbcPitch(source, index);
	if (!pitchResult) {
		return null;
	}

	const durationResult = parseAbcDurationSuffix(source, index + pitchResult.consumed);
	const duration = abcSuffixToDuration(durationResult.suffix, defaultNoteDuration);
	if (!duration) {
		return null;
	}

	return {
		event: {
			kind: 'note',
			pitches: [pitchResult.pitch],
			duration,
		},
		consumed: pitchResult.consumed + durationResult.consumed,
	};
}

/** Read a `z` rest and its duration suffix from the current index in a measure. */
function parseRest(
	source: string,
	index: number,
	defaultNoteDuration: Score['defaultNoteDuration'],
): { event: MeasureEvent; consumed: number } | null {
	if (source[index] !== 'z') {
		return null;
	}

	const durationResult = parseAbcDurationSuffix(source, index + 1);
	const duration = abcSuffixToDuration(durationResult.suffix, defaultNoteDuration);
	if (!duration) {
		return null;
	}

	return {
		event: { kind: 'rest', duration },
		consumed: 1 + durationResult.consumed,
	};
}

/** Read a `[...]` chord and keep only the first pitch, which is all v1 can store. */
function parseChord(
	source: string,
	index: number,
	defaultNoteDuration: Score['defaultNoteDuration'],
	warnings: AbcParseWarning[],
): { event: NoteEvent; consumed: number } | null {
	if (source[index] !== '[') {
		return null;
	}

	const closeIndex = source.indexOf(']', index + 1);
	if (closeIndex === -1) {
		return null;
	}

	const inner = source.slice(index + 1, closeIndex);
	const pitchResult = parseAbcPitch(inner, 0);
	if (!pitchResult) {
		return null;
	}

	pushWarning(warnings, 'chord', 'Chord detected; using the first pitch only.');

	let consumed = closeIndex - index + 1;
	const durationResult = parseAbcDurationSuffix(source, index + consumed);
	const duration = abcSuffixToDuration(durationResult.suffix, defaultNoteDuration) ?? 'quarter';
	consumed += durationResult.consumed;

	return {
		event: {
			kind: 'note',
			pitches: [pitchResult.pitch],
			duration,
		},
		consumed,
	};
}

/** Add a parse warning once; repeated identical messages are dropped so the UI is not spammed. */
function pushWarning(
	warnings: AbcParseWarning[],
	kind: AbcParseWarning['kind'],
	message: string,
): void {
	if (warnings.some((warning) => warning.kind === kind && warning.message === message)) {
		return;
	}
	warnings.push({ kind, message });
}

/** Compare two scores for round-trip testing (ignores extra empty measures). */
export function scoresEqual(a: Score, b: Score): boolean {
	if (
		a.timeSignature !== b.timeSignature
		|| a.keySignature !== b.keySignature
		|| a.defaultNoteDuration !== b.defaultNoteDuration
		|| a.staves.length !== b.staves.length
	) {
		return false;
	}

	for (let staffIndex = 0; staffIndex < a.staves.length; staffIndex++) {
		const staffA = a.staves[staffIndex];
		const staffB = b.staves[staffIndex];
		if (!staffA || !staffB) {
			return false;
		}
		if (staffA.clef !== staffB.clef) {
			return false;
		}
		if (staffA.measures.length !== staffB.measures.length) {
			return false;
		}
		for (let measureIndex = 0; measureIndex < staffA.measures.length; measureIndex++) {
			const measureA = staffA.measures[measureIndex];
			const measureB = staffB.measures[measureIndex];
			if (!measureA || !measureB) {
				return false;
			}
			if (measureA.events.length !== measureB.events.length) {
				return false;
			}
			for (let eventIndex = 0; eventIndex < measureA.events.length; eventIndex++) {
				if (!eventsEqual(measureA.events[eventIndex], measureB.events[eventIndex])) {
					return false;
				}
			}
		}
	}

	return true;
}

/** Compare one note or rest, including the first pitch's step, octave, and accidental. */
function eventsEqual(a: MeasureEvent | undefined, b: MeasureEvent | undefined): boolean {
	if (!a || !b) {
		return false;
	}
	if (a.kind !== b.kind || a.duration !== b.duration) {
		return false;
	}
	if (a.kind === 'rest' && b.kind === 'rest') {
		return true;
	}
	if (a.kind !== 'note' || b.kind !== 'note') {
		return false;
	}
	const pitchA = a.pitches[0];
	const pitchB = b.pitches[0];
	if (!pitchA || !pitchB) {
		return pitchA === pitchB;
	}
	return (
		pitchA.step === pitchB.step
		&& pitchA.octave === pitchB.octave
		&& pitchA.accidental === pitchB.accidental
	);
}
