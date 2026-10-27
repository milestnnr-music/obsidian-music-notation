/**
 * Phase 5.2: snap grid, measure hit-test, and score placement.
 * Run: npm run test:staff-placement
 */
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';
import abcjs from 'abcjs';

const jiti = createJiti(import.meta.url);
const { verticalPosToPitch, TREBLE_BOTTOM_LINE_VERTICAL_POS } = await jiti.import(
	'../src/editor/pitch-hit-test.ts',
);
const {
	SNAP_MIN_VERTICAL_POS,
	SNAP_MAX_VERTICAL_POS,
	buildSnapGrid,
	snapVerticalPos,
	clientYForVerticalPos,
	readStaffLineGeometryClient,
} = await jiti.import('../src/editor/snap-grid.ts');
const { xToMeasureIndex, clientToSvgPoint } = await jiti.import(
	'../src/editor/measure-hit-test.ts',
);
const {
	placeNoteInScore,
	parseSourceToScore,
	applyToolbarAccidental,
} = await jiti.import('../src/editor/score-session.ts');
const { createEmptyScore, scoreHasEvents } = await jiti.import('../src/model/score.ts');
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');
const { getImplicitDefaultAbcShell } = await jiti.import(
	'../src/serializer/abc-defaults.ts',
);

let passed = 0;
let failed = 0;

/** Record a pass or fail for one staff-placement check without stopping the rest of the script. */
function assert(condition, message) {
	if (!condition) {
		console.error(`FAIL: ${message}`);
		failed++;
		return;
	}
	console.log(`OK: ${message}`);
	passed++;
}

const middleC = verticalPosToPitch(0);
assert(middleC.step === 'C' && middleC.octave === 3, 'verticalPos 0 is model C3 (abcjs p0 / ABC uppercase C)');

const e4 = verticalPosToPitch(TREBLE_BOTTOM_LINE_VERTICAL_POS);
assert(e4.step === 'E' && e4.octave === 3, 'verticalPos 2 is model E3 (abcjs p2 / treble bottom line)');

assert(SNAP_MIN_VERTICAL_POS === 0, 'snap min is middle C ledger');
assert(SNAP_MAX_VERTICAL_POS === 12, 'snap max is one ledger above staff');

const geometry = { bottomLineY: 100, stepPx: 5 };
const grid = { geometry, slotClientY: new Map() };
for (let vp = SNAP_MIN_VERTICAL_POS; vp <= SNAP_MAX_VERTICAL_POS; vp++) {
	grid.slotClientY.set(vp, clientYForVerticalPos(vp, geometry));
}

assert(snapVerticalPos(100, grid) === 2, 'snap on bottom line maps to verticalPos 2');
assert(snapVerticalPos(95, grid) === 3, 'snap one diatonic step above bottom line maps to F4');
assert(snapVerticalPos(110, grid) === 0, 'snap two steps below bottom line maps to middle C');
assert(snapVerticalPos(50, grid) === 12, 'snap far above staff clamps to top ledger (vp 12)');
assert(snapVerticalPos(200, grid) === 0, 'snap far below staff clamps to bottom ledger (vp 0)');

assert(xToMeasureIndex(50, [80, 160]) === 0, 'x before first bar is measure 0');
assert(xToMeasureIndex(120, [80, 160]) === 1, 'x after first bar is measure 1');
assert(xToMeasureIndex(50, []) === 0, 'no bars defaults to measure 0');

const empty = createEmptyScore();
assert(!scoreHasEvents(empty), 'empty score has no events');

const placed = placeNoteInScore(empty, 0, { step: 'G', octave: 4 }, 'quarter');
assert(scoreHasEvents(placed), 'placed score has events');
const abc = writeAbc(placed);
assert(abc.includes('g'), 'placed score writes g (G4) to ABC');

const sharpG = applyToolbarAccidental({ step: 'G', octave: 4 }, 'sharp');
assert(sharpG.accidental === 'sharp', 'toolbar sharp applies to pitch');

const parsed = parseSourceToScore('');
assert(!scoreHasEvents(parsed), 'empty source parses to empty score');

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.SVGElement = window.SVGElement;
globalThis.SVGLineElement = window.SVGLineElement;
globalThis.SVGPathElement = window.SVGPathElement;
globalThis.SVGGraphicsElement = window.SVGGraphicsElement;

const mount = window.document.createElement('div');
window.document.body.appendChild(mount);
const notationEl = window.document.createElement('div');
mount.appendChild(notationEl);

abcjs.renderAbc(notationEl, getImplicitDefaultAbcShell(), { staffwidth: 740, add_classes: true });
const svg = notationEl.querySelector('svg');
assert(svg !== null, 'implicit default ABC renders svg for geometry smoke test');

const staffGeometry = readStaffLineGeometryClient(svg);
assert(staffGeometry !== null, 'readStaffLineGeometryClient finds treble staff lines');

const snapGrid = buildSnapGrid(svg);
assert(snapGrid !== null, 'buildSnapGrid returns slot map');

if (staffGeometry && snapGrid) {
	const c4Y = clientYForVerticalPos(0, staffGeometry);
	const c4Snap = snapVerticalPos(c4Y, snapGrid);
	assert(c4Snap === 0, 'snap at middle C staff position maps to vp 0');

	const f4Y = clientYForVerticalPos(3, staffGeometry);
	const f4Snap = snapVerticalPos(f4Y, snapGrid);
	assert(f4Snap === 3, 'snap at F4 staff position maps to vp 3');

	svg.setAttribute('width', '770');
	svg.setAttribute('height', '95');
	const intrinsicBottomY = staffGeometry.bottomLineY;
	const displayHeight = 47.5;
	const displayWidth = 385;
	const displayBottomY = (intrinsicBottomY / 95) * displayHeight;
	svg.getBoundingClientRect = () => ({
		left: 0,
		top: 0,
		width: displayWidth,
		height: displayHeight,
		right: displayWidth,
		bottom: displayHeight,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	});
	const mapped = clientToSvgPoint(svg, 100, displayBottomY);
	assert(
		Math.abs(mapped.y - intrinsicBottomY) < 1,
		'scaled viewport click maps to intrinsic staff Y',
	);
}

const { pitchToAbc } = await jiti.import('../src/serializer/abc-mapping.ts');
const vp0Abc = pitchToAbc(verticalPosToPitch(0));
assert(vp0Abc === 'C', 'verticalPos 0 serializes to ABC uppercase C');
const vp2Abc = pitchToAbc(verticalPosToPitch(2));
assert(vp2Abc === 'E', 'verticalPos 2 serializes to ABC uppercase E');

const notationEl2 = window.document.createElement('div');
mount.appendChild(notationEl2);
abcjs.renderAbc(notationEl2, `X:1\nM:4/4\nL:1/4\nK:C\n${vp0Abc}|\n`, {
	staffwidth: 740,
	add_classes: true,
});
const pClass = notationEl2
	.querySelector('.abcjs-note')
	?.getAttribute('class')
	?.match(/abcjs-p(-?\d+)/)?.[1];
assert(pClass === '0', 'ABC from verticalPos 0 renders at abcjs-p0');

// Per-note slot override would snap below an existing A to G; geometry-only keeps A.
const vp5Y = clientYForVerticalPos(5, geometry);
const badCalibratedGrid = {
	geometry,
	slotClientY: new Map(),
};
for (let vp = SNAP_MIN_VERTICAL_POS; vp <= SNAP_MAX_VERTICAL_POS; vp++) {
	badCalibratedGrid.slotClientY.set(vp, clientYForVerticalPos(vp, geometry));
}
badCalibratedGrid.slotClientY.set(5, vp5Y - 2);
const nearSamePitchY = vp5Y + 2;
assert(
	snapVerticalPos(nearSamePitchY, badCalibratedGrid) === 4,
	'per-note calibration bug: near note snaps to wrong pitch',
);
const goodGrid = {
	geometry,
	slotClientY: new Map(),
};
for (let vp = SNAP_MIN_VERTICAL_POS; vp <= SNAP_MAX_VERTICAL_POS; vp++) {
	goodGrid.slotClientY.set(vp, clientYForVerticalPos(vp, geometry));
}
assert(
	snapVerticalPos(nearSamePitchY, goodGrid) === 5,
	'geometry-only grid: near note still snaps to same pitch slot',
);

if (failed > 0) {
	console.error(`\n${failed} failed, ${passed} passed`);
	process.exit(1);
}

console.log(`\n${passed} passed, ${failed} failed`);
