import type { NoteDuration, Score } from './types';
import { ABC_DEFAULTS } from '../serializer/abc-defaults';

/** True when the score has at least one note or rest, used to decide whether an empty fence should stay blank. */
export function scoreHasEvents(score: Score): boolean {
	return score.staves.some((staff) =>
		staff.measures.some((measure) => measure.events.length > 0),
	);
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
