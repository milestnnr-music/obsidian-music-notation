export const NOTE_SELECTED_CLASS = 'abc-blocks-note-selected';
export const NOTE_HOVER_CLASS = 'abc-blocks-note-hover';
export const NOTE_SELECTED_ATTR = 'data-abc-blocks-selected';
export const NOTE_HOVER_ATTR = 'data-abc-blocks-hovered';
const ABCJS_SELECTED_CLASS = 'abcjs-note_selected';
const ABCJS_HIGHLIGHT_FILL = /^#?ff0000$/i;

export interface ScoreNoteRef {
	readonly measureIndex: number;
	readonly eventIndex: number;
}

const SCORE_EVENT_SELECTOR = '.abcjs-note, .abcjs-rest';

function findScoreEventGroup(element: Element, svg: SVGSVGElement): Element | null {
	const group = element.closest(SCORE_EVENT_SELECTOR);
	if (group && svg.contains(group)) {
		return group;
	}
	return null;
}

/** DOM hit-test: find the topmost abcjs note or rest group under the cursor. */
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
			const eventEl = findScoreEventGroup(candidate, svg);
			if (eventEl) {
				return eventEl;
			}
		}
		return null;
	}

	for (const eventEl of Array.from(svg.querySelectorAll(SCORE_EVENT_SELECTOR))) {
		const rect = eventEl.getBoundingClientRect();
		if (
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom
		) {
			return eventEl;
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

function setNoteMarked(
	el: Element | null,
	attr: string,
	className: string,
	on: boolean,
): void {
	if (!el) {
		return;
	}
	if (on) {
		el.setAttribute(attr, 'true');
		el.classList.add(className);
		return;
	}
	el.removeAttribute(attr);
	el.classList.remove(className);
	const raw = el.getAttribute('class');
	if (!raw) {
		return;
	}
	const next = raw
		.split(/\s+/)
		.filter((token) => token.length > 0 && token !== className)
		.join(' ');
	if (next.length > 0) {
		el.setAttribute('class', next);
	} else {
		el.removeAttribute('class');
	}
}

function restoreElementAbcjsHighlight(el: Element, defaultFill: string): void {
	const highlightAttr = el.getAttribute('highlight') ?? 'fill';
	const painted = el.getAttribute(highlightAttr);
	if (painted && ABCJS_HIGHLIGHT_FILL.test(painted)) {
		el.setAttribute(highlightAttr, defaultFill);
	}

	const fill = el.getAttribute('fill');
	if (fill && ABCJS_HIGHLIGHT_FILL.test(fill)) {
		el.setAttribute('fill', defaultFill);
	}

	if (el.classList.contains(ABCJS_SELECTED_CLASS)) {
		el.classList.remove(ABCJS_SELECTED_CLASS);
		const raw = el.getAttribute('class');
		if (!raw) {
			return;
		}
		const next = raw
			.split(/\s+/)
			.filter((token) => token.length > 0 && token !== ABCJS_SELECTED_CLASS)
			.join(' ');
		if (next.length > 0) {
			el.setAttribute('class', next);
		} else {
			el.removeAttribute('class');
		}
	}
}

/** Undo abcjs built-in click highlight (inline fill #ff0000 on note glyphs). */
export function restoreAbcjsNoteAppearance(note: Element): void {
	const defaultFill =
		note.closest('svg')?.getAttribute('fill') ?? 'currentColor';
	const walk = [note, ...Array.from(note.querySelectorAll('*'))];
	for (const el of walk) {
		if (isElementNode(el)) {
			restoreElementAbcjsHighlight(el, defaultFill);
		}
	}
}

/** Remove selection/hover marks from every note under the given roots. */
export function stripAllNoteVisualState(roots: readonly ParentNode[]): void {
	const seen = new Set<Element>();
	for (const root of roots) {
		for (const el of Array.from(root.querySelectorAll(`[${NOTE_SELECTED_ATTR}="true"]`))) {
			if (!seen.has(el)) {
				seen.add(el);
				setNoteMarked(el, NOTE_SELECTED_ATTR, NOTE_SELECTED_CLASS, false);
			}
		}
		for (const el of Array.from(root.querySelectorAll(`[${NOTE_HOVER_ATTR}="true"]`))) {
			if (!seen.has(el)) {
				seen.add(el);
				setNoteMarked(el, NOTE_HOVER_ATTR, NOTE_HOVER_CLASS, false);
			}
		}
		for (const el of Array.from(root.querySelectorAll(`.${NOTE_SELECTED_CLASS}`))) {
			if (!seen.has(el)) {
				seen.add(el);
				setNoteMarked(el, NOTE_SELECTED_ATTR, NOTE_SELECTED_CLASS, false);
			}
		}
		for (const el of Array.from(root.querySelectorAll(`.${NOTE_HOVER_CLASS}`))) {
			if (!seen.has(el)) {
				seen.add(el);
				setNoteMarked(el, NOTE_HOVER_ATTR, NOTE_HOVER_CLASS, false);
			}
		}
		for (const note of Array.from(root.querySelectorAll(SCORE_EVENT_SELECTOR))) {
			restoreAbcjsNoteAppearance(note);
		}
		for (const el of Array.from(
			root.querySelectorAll(`.${ABCJS_SELECTED_CLASS}`),
		)) {
			restoreAbcjsNoteAppearance(el);
		}
	}
}

/** Tracks hover preview and Shift+click selection on rendered notes. */
export class NoteSelectionController {
	private hoverEl: Element | null = null;
	private selectedEl: Element | null = null;
	private readonly visualRoots: ParentNode[];

	constructor(visualRoots: readonly ParentNode[] = []) {
		this.visualRoots = [...visualRoots];
	}

	setHoverNote(note: Element | null): void {
		if (this.hoverEl === note) {
			return;
		}
		setNoteMarked(this.hoverEl, NOTE_HOVER_ATTR, NOTE_HOVER_CLASS, false);
		this.hoverEl = note;
		setNoteMarked(this.hoverEl, NOTE_HOVER_ATTR, NOTE_HOVER_CLASS, true);
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
		if (this.selectedEl && this.selectedEl !== note) {
			restoreAbcjsNoteAppearance(this.selectedEl);
		}
		setNoteMarked(this.selectedEl, NOTE_SELECTED_ATTR, NOTE_SELECTED_CLASS, false);
		this.selectedEl = note;
		setNoteMarked(this.selectedEl, NOTE_SELECTED_ATTR, NOTE_SELECTED_CLASS, true);
		return ref;
	}

	clearSelection(): void {
		setNoteMarked(this.selectedEl, NOTE_SELECTED_ATTR, NOTE_SELECTED_CLASS, false);
		this.selectedEl = null;
		stripAllNoteVisualState(this.visualRoots);
	}

	clearAllVisualState(): void {
		this.clearHover();
		this.clearSelection();
	}

	getSelection(): ScoreNoteRef | null {
		if (!this.selectedEl) {
			return null;
		}
		return readScoreNoteRef(this.selectedEl);
	}

	dispose(): void {
		this.clearAllVisualState();
	}
}
