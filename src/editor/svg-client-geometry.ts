import { svgUserYToClientY } from './measure-hit-test';

/** Map rendered SVG elements to viewport (client) coordinates. */

interface SvgIntrinsicBox {
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
}

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

function isSvgGraphicsElement(el: Element): el is SVGGraphicsElement {
	return typeof (el as SVGGraphicsElement).getBBox === 'function';
}

/** Center Y of an SVG element in viewport client coordinates. */
export function elementClientCenterY(el: Element): number | null {
	const rect = el.getBoundingClientRect();
	if (rect.width > 0 || rect.height > 0) {
		return rect.top + rect.height / 2;
	}

	if (!isSvgGraphicsElement(el)) {
		return null;
	}

	const svg = el.ownerSVGElement;
	if (!svg || typeof svg.createSVGPoint !== 'function') {
		return null;
	}

	const box = el.getBBox();
	const ctm = el.getCTM();
	const pt = svg.createSVGPoint();
	if (ctm && typeof pt.matrixTransform === 'function') {
		pt.x = box.x + box.width / 2;
		pt.y = box.y + box.height / 2;
		const inSvgRoot = pt.matrixTransform(ctm);

		const svgRect = svg.getBoundingClientRect();
		const intrinsic = readSvgIntrinsicBox(svg, svgRect);
		if (svgRect.height <= 0 || intrinsic.height <= 0) {
			return inSvgRoot.y;
		}

		return svgRect.top + ((inSvgRoot.y - intrinsic.y) / intrinsic.height) * svgRect.height;
	}

	if (el.tagName.toLowerCase() === 'path') {
		const pathY = horizontalCenterFromPathD(el.getAttribute('d'));
		if (pathY !== null) {
			return svgUserYToClientY(svg, pathY);
		}
	}

	return null;
}

function horizontalCenterFromPathD(d: string | null): number | null {
	if (!d) {
		return null;
	}

	const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!numbers || numbers.length < 8) {
		return null;
	}

	const yTop = numbers[1];
	const yBottom = numbers[5];
	if (yTop === undefined || yBottom === undefined) {
		return null;
	}

	if (Math.abs(yTop - yBottom) > 2) {
		return null;
	}

	return (yTop + yBottom) / 2;
}
