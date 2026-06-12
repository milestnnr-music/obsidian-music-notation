import type { NoteDuration } from '../model/types';
import { renderAbcToElement } from '../renderer/abcjs-adapter';
import { ABC_DEFAULTS } from '../serializer/abc-defaults';
import { defaultDurationToAbcL } from '../serializer/abc-mapping';

const TOOLBAR_PREVIEW_STAFF_WIDTH = 110;
const GLYPH_PAD = 2;
const GLYPH_ICON_CLASS = 'abc-blocks-toolbar-glyph-icon';

/** One treble note per duration — same abcjs engraving as the staff. */
const DURATION_PREVIEW_NOTE: Readonly<Record<NoteDuration, string>> = {
	whole: 'C4',
	half: 'C2',
	quarter: 'C',
	eighth: 'C/',
};

function toolbarPreviewAbc(body: string): string {
	return [
		'X:1',
		`M:${ABC_DEFAULTS.timeSignature}`,
		`L:${defaultDurationToAbcL(ABC_DEFAULTS.defaultNoteDuration)}`,
		`K:${ABC_DEFAULTS.keySignature}`,
		`${body}|`,
	].join('\n');
}

function durationPreviewAbc(duration: NoteDuration): string {
	return toolbarPreviewAbc(DURATION_PREVIEW_NOTE[duration]);
}

function restPreviewAbc(): string {
	return toolbarPreviewAbc('z');
}

interface NoteBBox {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

function readElementBBox(element: Element): NoteBBox | null {
	if (!('getBBox' in element) || typeof element.getBBox !== 'function') {
		return null;
	}

	try {
		const box = (element.getBBox as () => NoteBBox)();
		if (box.width > 0 && box.height > 0) {
			return box;
		}
	} catch {
		// getBBox unavailable until attached in some environments
	}

	return null;
}

function mountExtractedGlyph(
	icon: HTMLElement,
	source: Element,
	bbox: NoteBBox,
	doc: Document,
): void {
	const svgNs = 'http://www.w3.org/2000/svg';
	const svg = doc.createElementNS(svgNs, 'svg');
	svg.classList.add('abc-blocks-toolbar-abcjs-glyph');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute(
		'viewBox',
		[
			bbox.x - GLYPH_PAD,
			bbox.y - GLYPH_PAD,
			bbox.width + GLYPH_PAD * 2,
			bbox.height + GLYPH_PAD * 2,
		].join(' '),
	);
	svg.appendChild(source.cloneNode(true));
	icon.appendChild(svg);
}

function mountPreviewCrop(icon: HTMLElement, scratch: HTMLElement): void {
	icon.addClass('abc-blocks-toolbar-glyph-preview-live');
	icon.appendChild(scratch);
}

function mountFallbackSvgFromString(icon: HTMLElement, markup: string, doc: Document): void {
	const parsed = new doc.defaultView!.DOMParser().parseFromString(markup, 'image/svg+xml');
	const svg = parsed.documentElement;
	if (svg.tagName.toLowerCase() === 'svg') {
		svg.classList.add('abc-blocks-toolbar-glyph-fallback');
		icon.appendChild(doc.importNode(svg, true));
	}
}

const DURATION_FALLBACK_SVG: Readonly<Record<NoteDuration, string>> = {
	whole: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="10" cy="12" rx="7.5" ry="4.8" fill="none" stroke="currentColor" stroke-width="1.35"/></svg>`,
	half: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="8.5" cy="12" rx="5.5" ry="4" fill="none" stroke="currentColor" stroke-width="1.35"/><line x1="14" y1="12" x2="14" y2="2.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>`,
	quarter: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="8.5" cy="12" rx="5" ry="3.6" fill="currentColor"/><line x1="13.5" y1="12" x2="13.5" y2="2.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>`,
	eighth: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="8.5" cy="12" rx="5" ry="3.6" fill="currentColor"/><line x1="13.5" y1="12" x2="13.5" y2="2.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><path d="M13.5 2.5 Q17.5 4.5 13.5 7.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
};

const REST_FALLBACK_SVG = `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M8 14c3-1 5-3 5-5.5c0-2-1.5-3.5-3.5-3.5S6 6.5 6 8.5c0 1.2.6 2.2 1.6 2.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

function mountAbcjsToolbarGlyph(
	button: HTMLElement,
	abc: string,
	eventSelector: string,
	onFallback: (icon: HTMLElement, doc: Document) => void,
): void {
	const icon = button.createSpan({ cls: GLYPH_ICON_CLASS });
	icon.setAttr('aria-hidden', 'true');

	const doc = button.ownerDocument;
	const scratch = button.createDiv({ cls: 'abc-blocks-toolbar-glyph-scratch' });
	Object.assign(scratch.style, {
		position: 'fixed',
		left: '-10000px',
		top: '0',
		width: `${TOOLBAR_PREVIEW_STAFF_WIDTH}px`,
		visibility: 'hidden',
		pointerEvents: 'none',
	});
	doc.body.appendChild(scratch);

	const result = renderAbcToElement(scratch, abc, {
		staffwidth: TOOLBAR_PREVIEW_STAFF_WIDTH,
	});

	if (!result.ok) {
		scratch.remove();
		onFallback(icon, doc);
		button.appendChild(icon);
		return;
	}

	const eventEl = scratch.querySelector(eventSelector);
	if (!eventEl) {
		scratch.remove();
		onFallback(icon, doc);
		button.appendChild(icon);
		return;
	}

	const bbox = readElementBBox(eventEl);
	if (bbox) {
		mountExtractedGlyph(icon, eventEl, bbox, doc);
		scratch.remove();
	} else {
		scratch.classList.remove('abc-blocks-toolbar-glyph-scratch');
		scratch.classList.add('abc-blocks-toolbar-glyph-preview-mount');
		mountPreviewCrop(icon, scratch);
	}

	button.appendChild(icon);
}

/** Mount a duration icon using the same abcjs engraving as the score. */
export function mountDurationIcon(button: HTMLElement, duration: NoteDuration): void {
	mountAbcjsToolbarGlyph(
		button,
		durationPreviewAbc(duration),
		'.abcjs-note',
		(icon, doc) => {
			mountFallbackSvgFromString(icon, DURATION_FALLBACK_SVG[duration], doc);
		},
	);
}

/** Mount a quarter-rest icon using the same abcjs engraving as the score. */
export function mountRestIcon(button: HTMLElement): void {
	mountAbcjsToolbarGlyph(button, restPreviewAbc(), '.abcjs-rest', (icon, doc) => {
		mountFallbackSvgFromString(icon, REST_FALLBACK_SVG, doc);
	});
}
