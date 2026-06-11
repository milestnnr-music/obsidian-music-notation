import type { Pitch, PitchStep } from '../model/types';

const DIATONIC_STEPS: readonly PitchStep[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Treble staff bottom line (E4) in abcjs vertical position units. */
export const TREBLE_BOTTOM_LINE_VERTICAL_POS = 2;

/** Treble staff top line (F5) in abcjs vertical position units. */
export const TREBLE_TOP_LINE_VERTICAL_POS = 10;

/**
 * Map abcjs vertical position to the v1 Score `Pitch` model.
 *
 * abcjs `abcjs-p{N}` uses middle C = 0. Our serializer uses ABC body octaves where
 * uppercase `C` is model octave 3 (abcjs p0), lowercase `c` is model octave 4 (p7), etc.
 * Do not use “musical octave 4” here — `pitchToAbc` + abcjs expect model octaves.
 */
export function verticalPosToPitch(verticalPos: number): Pitch {
	let pos = verticalPos;
	const octave = 3 + Math.floor(pos / DIATONIC_STEPS.length);
	pos = ((pos % DIATONIC_STEPS.length) + DIATONIC_STEPS.length) % DIATONIC_STEPS.length;

	const step = DIATONIC_STEPS[pos];
	if (!step) {
		return { step: 'C', octave: 3 };
	}
	return { step, octave };
}
