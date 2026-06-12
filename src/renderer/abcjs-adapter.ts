import { renderAbc, type TuneObject } from 'abcjs';
import { ABC_FALLBACK_MESSAGE } from '../editor/error-copy';
import { abcHasMusicLines, normalizeAbcBlockBody } from '../plugin/block-source';
import { abcjsTuneHasMusicParseErrors } from './abc-render-validity';

export type AbcRenderResult =
	| { ok: true; tune: TuneObject }
	| { ok: false; error: string };

export interface AbcRenderOptions {
	/** Override staff width in pixels (default: derived from container or 740). */
	staffwidth?: number;
}

const DEFAULT_STAFF_WIDTH = 740;
const MIN_STAFF_WIDTH = 200;

/**
 * Phase 2.1: Render ABC notation text into a DOM element via abcjs.
 * Clears `container` and appends an SVG staff when successful.
 */
export function renderAbcToElement(
	container: HTMLElement,
	abc: string,
	options: AbcRenderOptions = {},
): AbcRenderResult {
	const trimmed = normalizeAbcBlockBody(abc);
	if (!trimmed) {
		return { ok: false, error: ABC_FALLBACK_MESSAGE };
	}

	container.empty();

	const notationEl = container.ownerDocument.createElement('div');
	notationEl.className = 'abc-blocks-notation';
	container.appendChild(notationEl);

	const staffwidth = options.staffwidth ?? resolveStaffWidth(container);
	const renderParams = {
		staffwidth,
		add_classes: true,
		// Avoid abcjs default #ff0000 click highlight when a handler slips through.
		selectionColor: 'currentColor',
	};

	try {
		const tunes = renderAbc(notationEl, trimmed, renderParams);
		const tune = tunes[0];
		if (!tune) {
			return { ok: false, error: ABC_FALLBACK_MESSAGE };
		}

		const svg = notationEl.querySelector('svg');
		if (!svg || !svgHasNotation(svg) || abcjsTuneHasMusicParseErrors(tune)) {
			return { ok: false, error: ABC_FALLBACK_MESSAGE };
		}

		return { ok: true, tune };
	} catch {
		return { ok: false, error: ABC_FALLBACK_MESSAGE };
	}
}

/** Render after layout; retries when Live Preview mounts before the block is measurable. */
export function renderAbcToElementWhenReady(
	container: HTMLElement,
	abc: string,
	options: AbcRenderOptions = {},
): Promise<AbcRenderResult> {
	const trimmed = normalizeAbcBlockBody(abc);
	if (!trimmed) {
		return Promise.resolve({ ok: false, error: ABC_FALLBACK_MESSAGE });
	}

	const delays = [0, 0, 50, 150];
	let attempt = 0;

	const tryRender = (): Promise<AbcRenderResult> => {
		const result = renderAbcToElement(container, trimmed, options);
		if (result.ok) {
			return Promise.resolve(result);
		}

		if (!abcHasMusicLines(trimmed)) {
			return Promise.resolve(result);
		}

		attempt++;
		if (attempt >= delays.length) {
			return Promise.resolve(result);
		}

		const delay = delays[attempt] ?? 0;
		return new Promise((resolve) => {
			const run = () => {
				void tryRender().then(resolve);
			};
			if (delay === 0) {
				window.requestAnimationFrame(() => window.requestAnimationFrame(run));
			} else {
				window.setTimeout(run, delay);
			}
		});
	};

	return tryRender();
}

function svgHasNotation(svg: Element): boolean {
	return svg.querySelectorAll('path, line, text, rect').length > 0;
}

function resolveStaffWidth(container: HTMLElement): number {
	const paddingAllowance = 32;
	let el: HTMLElement | null = container;

	while (el) {
		const width = el.clientWidth;
		if (width > paddingAllowance) {
			return Math.max(MIN_STAFF_WIDTH, width - paddingAllowance);
		}
		el = el.parentElement;
	}

	return DEFAULT_STAFF_WIDTH;
}
