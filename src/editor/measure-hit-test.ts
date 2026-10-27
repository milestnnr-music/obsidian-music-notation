/** Bar-line X → measure index (retained from v0.2.x; pitch snap lives in snap-grid.ts). */

export interface SvgPoint {
	readonly x: number;
	readonly y: number;
}

/**
 * Map a viewport click to abcjs SVG user coordinates (fallback for headless tests).
 */
export function clientToSvgPoint(
	svg: SVGSVGElement,
	clientX: number,
	clientY: number,
): SvgPoint {
	const rect = svg.getBoundingClientRect();
	const box = readSvgIntrinsicBox(svg, rect);

	if (rect.width <= 0 || rect.height <= 0 || box.width <= 0 || box.height <= 0) {
		return { x: clientX - rect.left, y: clientY - rect.top };
	}

	return {
		x: box.x + ((clientX - rect.left) / rect.width) * box.width,
		y: box.y + ((clientY - rect.top) / rect.height) * box.height,
	};
}

/** Map abcjs SVG user Y to viewport client Y (inverse of clientToSvgPoint). */
export function svgUserYToClientY(svg: SVGSVGElement, userY: number): number {
	const rect = svg.getBoundingClientRect();
	const box = readSvgIntrinsicBox(svg, rect);

	if (rect.height <= 0 || box.height <= 0) {
		return userY;
	}

	return rect.top + ((userY - box.y) / box.height) * rect.height;
}

/** Bar-line X positions in viewport (client) coordinates. */
export function readBarLinePositionsClient(svg: SVGSVGElement): number[] {
	const positions: number[] = [];
	for (const el of Array.from(svg.querySelectorAll('[data-name="bar"]'))) {
		const rect = el.getBoundingClientRect();
		if (rect.width > 0 || rect.height > 0) {
			positions.push(rect.left + rect.width / 2);
			continue;
		}
		const x = barCenterXInSvg(svg, el);
		if (x !== null) {
			positions.push(x);
		}
	}
	return positions.sort((a, b) => a - b);
}

/** Bar-line X positions in SVG user coordinates (fallback). */
export function readBarLinePositions(svg: SVGSVGElement): number[] {
	const client = readBarLinePositionsClient(svg);
	const rect = svg.getBoundingClientRect();
	const box = readSvgIntrinsicBox(svg, rect);
	if (rect.width > 0 && box.width > 0 && client.length > 0) {
		const scale = box.width / rect.width;
		if (Number.isFinite(scale) && scale > 0 && Math.abs(scale - 1) > 0.01) {
			return client.map((x) => (x - rect.left) * scale + box.x);
		}
	}
	return client;
}

/**
 * Map click X to a measure index using rendered bar lines.
 * Falls back to measure 0 when no bars are found.
 */
export function xToMeasureIndex(x: number, barPositions: number[]): number {
	if (barPositions.length === 0) {
		return 0;
	}

	const unique = dedupeNear(barPositions, 4);
	let measureIndex = 0;
	for (const barX of unique) {
		if (x < barX) {
			return measureIndex;
		}
		measureIndex++;
	}
	return Math.max(0, measureIndex - 1);
}

/** Bar-line center in SVG units when the element has no viewport box, used by headless tests. */
function barCenterXInSvg(svg: SVGSVGElement, el: Element): number | null {
	if (typeof (el as SVGGraphicsElement).getBBox !== 'function') {
		return null;
	}

	const graphics = el as SVGGraphicsElement;
	const box = graphics.getBBox();
	const ctm = graphics.getCTM?.();
	if (ctm && typeof svg.createSVGPoint === 'function') {
		const pt = svg.createSVGPoint();
		pt.x = box.x + box.width / 2;
		pt.y = box.y + box.height / 2;
		if (typeof pt.matrixTransform === 'function') {
			return pt.matrixTransform(ctm).x;
		}
	}

	return box.x + box.width / 2;
}

interface SvgIntrinsicBox {
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
}

/** User-space size of the SVG, preferring viewBox over the on-screen pixel size. */
function readSvgIntrinsicBox(svg: SVGSVGElement, rect: DOMRect): SvgIntrinsicBox {
	const viewBox = svg.viewBox?.baseVal;
	if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
		return {
			width: viewBox.width,
			height: viewBox.height,
			x: viewBox.x,
			y: viewBox.y,
		};
	}

	const attrWidth = Number.parseFloat(svg.getAttribute('width') ?? '');
	const attrHeight = Number.parseFloat(svg.getAttribute('height') ?? '');

	return {
		width:
			Number.isFinite(attrWidth) && attrWidth > 0
				? attrWidth
				: rect.width || svg.clientWidth,
		height:
			Number.isFinite(attrHeight) && attrHeight > 0
				? attrHeight
				: rect.height || svg.clientHeight,
		x: 0,
		y: 0,
	};
}

/** Drop bar positions that sit on top of each other so a double bar is one measure boundary. */
function dedupeNear(values: number[], epsilon: number): number[] {
	const unique: number[] = [];
	for (const value of values) {
		const last = unique[unique.length - 1];
		if (last === undefined || Math.abs(value - last) > epsilon) {
			unique.push(value);
		}
	}
	return unique;
}
