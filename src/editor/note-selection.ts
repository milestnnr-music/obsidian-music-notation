export const NOTE_SELECTED_CLASS = 'abc-blocks-note-selected';
export const NOTE_HOVER_CLASS = 'abc-blocks-note-hover';

export interface ScoreNoteRef {
	readonly measureIndex: number;
	readonly eventIndex: number;
}

/** DOM hit-test: find the topmost abcjs note group under the cursor. */
export function findNoteElementAt(
	clientX: number,
	clientY: number,
	svg: SVGSVGElement,
): Element | null {
	const doc = svg.ownerDocument;
	const hitTest = doc.elementsFromPoint?.bind(doc);
	if (hitTest) {
		for (const candidate of hitTest(clientX, clientY)) {
			if (!isElementNode(candidate) || !svg.contains(candidate)) {
				continue;
			}
			const note = candidate.closest('.abcjs-note');
			if (note && svg.contains(note)) {
				return note;
			}
		}
		return null;
	}

	for (const note of Array.from(svg.querySelectorAll('.abcjs-note'))) {
		const rect = note.getBoundingClientRect();
		if (
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom
		) {
			return note;
		}
	}

	return null;
}

function isElementNode(value: unknown): value is Element {
	return (
		typeof value === 'object' &&
		value !== null &&
		'closest' in value &&
		typeof (value as Element).closest === 'function'
	);
}

export function readScoreNoteRef(element: Element): ScoreNoteRef | null {
	const measureRaw = element.getAttribute('data-measure-index');
	const eventRaw = element.getAttribute('data-event-index');
	if (measureRaw === null || eventRaw === null) {
		return null;
	}

	const measureIndex = Number.parseInt(measureRaw, 10);
	const eventIndex = Number.parseInt(eventRaw, 10);
	if (!Number.isFinite(measureIndex) || !Number.isFinite(eventIndex)) {
		return null;
	}

	return { measureIndex, eventIndex };
}

/** Tracks hover preview and Shift+click selection on rendered notes. */
export class NoteSelectionController {
	private hoverEl: Element | null = null;
	private selectedEl: Element | null = null;

	setHoverNote(note: Element | null): void {
		if (this.hoverEl === note) {
			return;
		}
		this.hoverEl?.classList.remove(NOTE_HOVER_CLASS);
		this.hoverEl = note;
		this.hoverEl?.classList.add(NOTE_HOVER_CLASS);
	}

	clearHover(): void {
		this.setHoverNote(null);
	}

	selectNote(note: Element): ScoreNoteRef | null {
		const ref = readScoreNoteRef(note);
		if (!ref) {
			return null;
		}

		this.clearHover();
		this.selectedEl?.classList.remove(NOTE_SELECTED_CLASS);
		this.selectedEl = note;
		this.selectedEl.classList.add(NOTE_SELECTED_CLASS);
		return ref;
	}

	clearSelection(): void {
		this.selectedEl?.classList.remove(NOTE_SELECTED_CLASS);
		this.selectedEl = null;
	}

	getSelection(): ScoreNoteRef | null {
		if (!this.selectedEl) {
			return null;
		}
		return readScoreNoteRef(this.selectedEl);
	}

	dispose(): void {
		this.clearHover();
		this.clearSelection();
	}
}
