import type { NoteDuration, PitchStep, Score } from './types';
import { ABC_DEFAULTS } from '../serializer/abc-defaults';

/** True when the score has at least one note or rest event. */
export function scoreHasEvents(score: Score): boolean {
	return score.staves.some((staff) =>
		staff.measures.some((measure) => measure.events.length > 0),
	);
}

/** Phase 4.3: implicit defaults plus one quarter note (first-edit stand-in until Phase 5). */
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

/** Phase 3: Score model constructors and immutable updates. */
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
