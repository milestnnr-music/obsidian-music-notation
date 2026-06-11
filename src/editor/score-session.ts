import type { NoteDuration, Pitch, Score } from '../model/types';
import { createEmptyScore, scoreHasEvents } from '../model/score';
import { isEmptyAbcBlockSource } from '../plugin/block-source';
import { parseAbc } from '../serializer/abc-parser';
import { writeAbc } from '../serializer/abc-writer';
import type { EditorAccidentalMode } from './editor-state';

export { setKeySignature, setTimeSignature } from './score-header-mutations';

/** Parse fence ABC into a Score, or implicit empty score for whitespace-only fences. */
export function parseSourceToScore(source: string): Score {
	if (isEmptyAbcBlockSource(source)) {
		return createEmptyScore();
	}

	const parsed = parseAbc(source);
	return parsed.score ?? createEmptyScore();
}

/** ABC text for rendering: headers from score; empty measure bar when no events. */
export function scoreToDisplayAbc(score: Score): string {
	if (!scoreHasEvents(score)) {
		return `${writeAbc(score)}\n|`;
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

/** Remove one event by measure/event index (no-op when out of range). */
export function deleteNoteFromScore(
	score: Score,
	measureIndex: number,
	eventIndex: number,
): Score {
	const staff = score.staves[0];
	if (!staff) {
		return score;
	}

	const measure = staff.measures[measureIndex];
	if (!measure || eventIndex < 0 || eventIndex >= measure.events.length) {
		return score;
	}

	const measures = staff.measures.map((m, mi) => {
		if (mi !== measureIndex) {
			return { events: [...m.events] };
		}
		return {
			events: m.events.filter((_, ei) => ei !== eventIndex),
		};
	});

	while (measures.length > 1) {
		const last = measures[measures.length - 1];
		if (!last || last.events.length > 0) {
			break;
		}
		measures.pop();
	}

	return {
		...score,
		staves: [{ ...staff, measures }],
	};
}
