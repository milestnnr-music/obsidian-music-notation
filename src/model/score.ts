import type { NoteDuration, PitchStep, Score } from './types';
import { ABC_DEFAULTS } from '../serializer/abc-defaults';

/** True when the score has at least one note or rest, used to decide whether an empty fence should stay blank. */
export function scoreHasEvents(score: Score): boolean {
	return score.staves.some((staff) =>
		staff.measures.some((measure) => measure.events.length > 0),
	);
}

/** Empty-score defaults plus one quarter note, used as a stand-in when a first edit needs a playable score. */
export function createFirstEditScore(step: PitchStep = 'C'): Score {
	const score = createEmptyScore();
	const staff = score.staves[0];
	if (!staff) {
		return score;
	}

	return {
		...score,
		staves: [
			{
				...staff,
				measures: [
					{
						events: [
							{
								kind: 'note',
								pitches: [{ step, octave: 3 }],
								duration: 'quarter',
							},
						],
					},
				],
			},
		],
	};
}

/** A blank treble score (4/4, C, one empty measure) for new fences and failed parses. */
export function createEmptyScore(
	defaultNoteDuration: NoteDuration = ABC_DEFAULTS.defaultNoteDuration,
): Score {
	return {
		timeSignature: ABC_DEFAULTS.timeSignature,
		keySignature: ABC_DEFAULTS.keySignature,
		defaultNoteDuration,
		staves: [
			{
				clef: 'treble',
				measures: [{ events: [] }],
			},
		],
	};
}
