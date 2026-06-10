import type { NoteDuration, Score } from './types';
import { ABC_DEFAULTS } from '../serializer/abc-defaults';

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
