import type { Score } from '../model/types';

const SCORE_EVENT_SELECTOR = '.abcjs-note, .abcjs-rest';

/** After abcjs render, tag note and rest groups so DOM selection maps to Score events. */
export function annotateRenderedNotes(svg: SVGSVGElement, score: Score): void {
	const eventElements = Array.from(svg.querySelectorAll(SCORE_EVENT_SELECTOR));
	const staff = score.staves[0];
	if (!staff) {
		return;
	}

	let domIndex = 0;
	for (let measureIndex = 0; measureIndex < staff.measures.length; measureIndex++) {
		const measure = staff.measures[measureIndex];
		if (!measure) {
			continue;
		}

		for (let eventIndex = 0; eventIndex < measure.events.length; eventIndex++) {
			const event = measure.events[eventIndex];
			if (event?.kind !== 'note' && event?.kind !== 'rest') {
				continue;
			}

			const el = eventElements[domIndex];
			if (!el) {
				return;
			}

			el.setAttribute('data-measure-index', String(measureIndex));
			el.setAttribute('data-event-index', String(eventIndex));
			domIndex++;
		}
	}
}
