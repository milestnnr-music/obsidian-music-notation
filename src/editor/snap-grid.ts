import {
	TREBLE_BOTTOM_LINE_VERTICAL_POS,
	TREBLE_TOP_LINE_VERTICAL_POS,
} from './pitch-hit-test';
import { elementClientCenterY } from './svg-client-geometry';
import { readBarLinePositionsClient, xToMeasureIndex } from './measure-hit-test';

/** Middle C (ledger below treble staff). */
export const SNAP_MIN_VERTICAL_POS = 0;

/** One ledger line above top staff line (~A5). */
export const SNAP_MAX_VERTICAL_POS = 12;

/** Treble staff has five horizontal lines (abcjs linePitch=2 spans vp 2–10). */
const TREBLE_STAFF_LINE_COUNT = 5;

export interface StaffLineGeometry {
	readonly bottomLineY: number;
	readonly stepPx: number;
}

export interface SnapPlacement {
	readonly verticalPos: number;
	readonly measureIndex: number;
	readonly guideClientY: number;
}

export interface SnapGrid {
	readonly geometry: StaffLineGeometry;
	readonly slotClientY: ReadonlyMap<number, number>;
}

/**
 * Build discrete pitch snap slots from staff line geometry (client Y only).
 * Slots stay on staff lines/spaces — never moved to notehead centers.
 */
export function buildSnapGrid(svg: SVGSVGElement): SnapGrid | null {
	const geometry = readStaffLineGeometryClient(svg);
	if (!geometry) {
		return null;
	}

	const slotClientY = new Map<number, number>();
	for (let vp = SNAP_MIN_VERTICAL_POS; vp <= SNAP_MAX_VERTICAL_POS; vp++) {
		slotClientY.set(vp, clientYForVerticalPos(vp, geometry));
	}

	return { geometry, slotClientY };
}

/** Nearest snapped pitch slot and target measure for a viewport click/hover. */
export function snapPlacement(
	svg: SVGSVGElement,
	clientX: number,
	clientY: number,
): SnapPlacement | null {
	const grid = buildSnapGrid(svg);
	if (!grid) {
		return null;
	}

	const verticalPos = snapVerticalPos(clientY, grid);
	const guideClientY = grid.slotClientY.get(verticalPos) ?? clientY;
	const measureIndex = xToMeasureIndex(clientX, readBarLinePositionsClient(svg));

	return { verticalPos, measureIndex, guideClientY };
}

/** Pick the nearest pitch slot in [SNAP_MIN, SNAP_MAX] by client Y. */
export function snapVerticalPos(clientY: number, grid: SnapGrid): number {
	let bestVp = SNAP_MIN_VERTICAL_POS;
	let bestDist = Number.POSITIVE_INFINITY;

	for (let vp = SNAP_MIN_VERTICAL_POS; vp <= SNAP_MAX_VERTICAL_POS; vp++) {
		const slotY = grid.slotClientY.get(vp);
		if (slotY === undefined) {
			continue;
		}
		const dist = Math.abs(clientY - slotY);
		if (dist < bestDist) {
			bestDist = dist;
			bestVp = vp;
		}
	}

	return bestVp;
}

/** Viewport Y of a pitch slot, counting up from the treble staff's bottom line. */
export function clientYForVerticalPos(
	verticalPos: number,
	geometry: StaffLineGeometry,
): number {
	return (
		geometry.bottomLineY -
		(verticalPos - TREBLE_BOTTOM_LINE_VERTICAL_POS) * geometry.stepPx
	);
}

/** Read staff line spacing in viewport (client) Y coordinates. */
export function readStaffLineGeometryClient(
	svg: SVGSVGElement,
): StaffLineGeometry | null {
	const staff = svg.querySelector('.abcjs-staff');
	if (!staff) {
		return null;
	}

	const ys = readStaffLineCentersClient(staff);
	if (ys.length < 2) {
		return null;
	}

	return geometryFromStaffLineYs(ys);
}

/** Viewport Y of each horizontal staff line, including ledger lines abcjs drew as paths. */
function readStaffLineCentersClient(staff: Element): number[] {
	const ys: number[] = [];
	for (const el of Array.from(staff.querySelectorAll('line, path'))) {
		if (!isHorizontalStaffLineElement(el)) {
			continue;
		}
		const y = elementClientCenterY(el);
		if (y !== null) {
			ys.push(y);
		}
	}
	return ys;
}

/** True for a wide line or a path whose top and bottom Y are almost the same. */
function isHorizontalStaffLineElement(el: Element): boolean {
	const rect = el.getBoundingClientRect();
	if (rect.width > rect.height * 2) {
		return true;
	}

	if (el.tagName.toLowerCase() !== 'path') {
		return false;
	}

	const d = el.getAttribute('d');
	if (!d) {
		return false;
	}

	const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!numbers || numbers.length < 8) {
		return false;
	}

	const yTop = numbers[1];
	const yBottom = numbers[5];
	if (yTop === undefined || yBottom === undefined) {
		return false;
	}

	return Math.abs(yTop - yBottom) <= 2;
}

/**
 * Derive stepPx from treble staff lines. When ledger lines are present, pick the
 * five most evenly spaced clusters (the staff proper, not ledgers).
 */
function geometryFromStaffLineYs(ys: number[]): StaffLineGeometry | null {
	const clusters = clusterYs(ys);
	if (clusters.length < 2) {
		return null;
	}

	const staffLines = pickTrebleStaffLineClusters(clusters);
	if (staffLines.length < 2) {
		return geometryFromLineSpan(
			clusters[0] ?? 0,
			clusters[clusters.length - 1] ?? 0,
		);
	}

	const topLineY = staffLines[0];
	const bottomLineY = staffLines[staffLines.length - 1];
	if (topLineY === undefined || bottomLineY === undefined) {
		return null;
	}

	return geometryFromLineSpan(topLineY, bottomLineY);
}

/** Choose the five most evenly spaced line clusters so ledger lines are not treated as the staff. */
function pickTrebleStaffLineClusters(clusters: number[]): number[] {
	if (clusters.length <= TREBLE_STAFF_LINE_COUNT) {
		return clusters;
	}

	let bestStart = 0;
	let bestScore = Number.POSITIVE_INFINITY;

	for (
		let start = 0;
		start <= clusters.length - TREBLE_STAFF_LINE_COUNT;
		start++
	) {
		const window = clusters.slice(start, start + TREBLE_STAFF_LINE_COUNT);
		const first = window[0];
		const last = window[window.length - 1];
		if (first === undefined || last === undefined) {
			continue;
		}
		const step = (last - first) / (TREBLE_STAFF_LINE_COUNT - 1);
		if (step <= 0) {
			continue;
		}

		let variance = 0;
		for (let i = 1; i < window.length; i++) {
			const prev = window[i - 1];
			const curr = window[i];
			if (prev === undefined || curr === undefined) {
				continue;
			}
			const delta = curr - prev;
			variance += Math.abs(delta - step);
		}

		if (variance < bestScore) {
			bestScore = variance;
			bestStart = start;
		}
	}

	return clusters.slice(bestStart, bestStart + TREBLE_STAFF_LINE_COUNT);
}

/** Convert the top and bottom staff lines into a pixels-per-pitch step. */
function geometryFromLineSpan(topLineY: number, bottomLineY: number): StaffLineGeometry | null {
	const pitchSpan = TREBLE_TOP_LINE_VERTICAL_POS - TREBLE_BOTTOM_LINE_VERTICAL_POS;
	const stepPx = (bottomLineY - topLineY) / pitchSpan;
	if (stepPx <= 0) {
		return null;
	}

	return { bottomLineY, stepPx };
}

/** Collapse Y values that are within 2px, because abcjs often draws a line as several segments. */
function clusterYs(ys: number[]): number[] {
	ys.sort((a, b) => a - b);
	const clusters: number[] = [];
	const threshold = 2;

	for (const y of ys) {
		const last = clusters[clusters.length - 1];
		if (last === undefined || Math.abs(y - last) > threshold) {
			clusters.push(y);
		}
	}

	return clusters;
}
