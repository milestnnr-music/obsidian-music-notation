import type { Score } from '../model/types';

/** Immutable key signature update (ABC `K:` value, e.g. `C`, `G`, `Bb`). */
export function setKeySignature(score: Score, keySignature: string): Score {
	if (score.keySignature === keySignature) {
		return score;
	}
	return { ...score, keySignature };
}

/** Immutable time signature update (ABC `M:` value, e.g. `4/4`, `3/4`). */
export function setTimeSignature(score: Score, timeSignature: string): Score {
	if (score.timeSignature === timeSignature) {
		return score;
	}
	return { ...score, timeSignature };
}
