import type { MeasureEvent, NoteEvent, RestEvent, Score } from '../model/types';
import {
	defaultDurationToAbcL,
	durationToAbcSuffix,
	pitchToAbc,
} from './abc-mapping';

/** Turn a score into ABC text (headers plus music) for the fence body and for on-screen rendering. */
export function writeAbc(score: Score): string {
	const lines = [
		'X:1',
		`M:${score.timeSignature}`,
		`L:${defaultDurationToAbcL(score.defaultNoteDuration)}`,
		`K:${score.keySignature}`,
	];

	const staff = score.staves[0];
	if (staff) {
		const body = staff.measures
			.map((measure) =>
				measure.events
					.map((event) => eventToAbc(event, score.defaultNoteDuration))
					.join(''),
			)
			.join('|');
		if (body.length > 0) {
			lines.push(`${body}|`);
		}
	}

	return lines.join('\n');
}

/** ABC token for one note or rest, relative to the score's default duration. */
function eventToAbc(
	event: MeasureEvent,
	defaultNoteDuration: Score['defaultNoteDuration'],
): string {
	if (event.kind === 'rest') {
		return restToAbc(event, defaultNoteDuration);
	}
	return noteToAbc(event, defaultNoteDuration);
}

/** ABC for the first pitch of a note; chords are stored as a single pitch in this model. */
function noteToAbc(
	note: NoteEvent,
	defaultNoteDuration: Score['defaultNoteDuration'],
): string {
	const pitch = note.pitches[0];
	if (!pitch) {
		return '';
	}

	const durationSuffix = durationToAbcSuffix(note.duration, defaultNoteDuration);
	return `${pitchToAbc(pitch)}${durationSuffix}`;
}

/** ABC rest token (`z` plus a duration suffix) for writing a rest back into the fence. */
function restToAbc(
	rest: RestEvent,
	defaultNoteDuration: Score['defaultNoteDuration'],
): string {
	const durationSuffix = durationToAbcSuffix(rest.duration, defaultNoteDuration);
	return `z${durationSuffix}`;
}
