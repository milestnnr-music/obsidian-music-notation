import type { NoteDuration, Pitch, Score } from '../model/types';
import { createEmptyScore, scoreHasEvents } from '../model/score';
import { isEmptyAbcBlockSource } from '../plugin/block-source';
import { getImplicitDefaultAbcShell } from '../serializer/abc-defaults';
import { parseAbc } from '../serializer/abc-parser';
import { writeAbc } from '../serializer/abc-writer';
import type { EditorAccidentalMode } from './editor-state';

/** Parse fence ABC into a Score, or implicit empty score for whitespace-only fences. */
export function parseSourceToScore(source: string): Score {
	if (isEmptyAbcBlockSource(source)) {
		return createEmptyScore();
	}

	const parsed = parseAbc(source);
	return parsed.score ?? createEmptyScore();
}

/** ABC text for rendering: implicit staff shell until the score has events. */
export function scoreToDisplayAbc(score: Score): string {
	if (!scoreHasEvents(score)) {
		return getImplicitDefaultAbcShell();
	}
	return writeAbc(score);
}

export function applyToolbarAccidental(
	pitch: Pitch,
	accidental: EditorAccidentalMode,
): Pitch {
	if (accidental === 'none') {
		return pitch;
	}
	return { ...pitch, accidental };
}

/** Append a note to the given measure (extends with empty measures when needed). */
export function placeNoteInScore(
	score: Score,
	measureIndex: number,
	pitch: Pitch,
	duration: NoteDuration,
): Score {
	const staff = score.staves[0];
	if (!staff) {
		return score;
	}

	const measures = staff.measures.map((measure) => ({
		events: [...measure.events],
	}));

	while (measures.length <= measureIndex) {
		measures.push({ events: [] });
	}

	const measure = measures[measureIndex] ?? { events: [] };
	measures[measureIndex] = {
		events: [
			...measure.events,
			{
				kind: 'note',
				pitches: [pitch],
				duration,
			},
		],
	};

	return {
		...score,
		staves: [{ ...staff, measures }],
	};
}
