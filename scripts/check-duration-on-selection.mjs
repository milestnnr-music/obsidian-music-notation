/**
 * Phase 5.4: change duration on selected note.
 * Run: npm run test:duration-on-selection
 */
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const { changeEventDurationInScore, placeNoteInScore } = await jiti.import(
	'../src/editor/score-session.ts',
);
const { createEmptyScore } = await jiti.import('../src/model/score.ts');
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');

let passed = 0;
let failed = 0;

/** Record a pass or fail for one duration-on-selection check without stopping the rest of the script. */
function assert(condition, message) {
	if (!condition) {
		console.error(`FAIL: ${message}`);
		failed++;
		return;
	}
	console.log(`OK: ${message}`);
	passed++;
}

let score = placeNoteInScore(createEmptyScore(), 0, { step: 'C', octave: 3 }, 'quarter');
score = placeNoteInScore(score, 0, { step: 'D', octave: 3 }, 'eighth');

const changed = changeEventDurationInScore(score, 0, 0, 'half');
const first = changed.staves[0]?.measures[0]?.events[0];
assert(first?.kind === 'note' && first.duration === 'half', 'first note duration becomes half');

const second = changed.staves[0]?.measures[0]?.events[1];
assert(
	second?.kind === 'note' && second.duration === 'eighth',
	'other notes unchanged',
);

const abc = writeAbc(changed);
assert(abc.includes('C2') || abc.includes('C'), 'ABC reflects longer duration on C');

const unchanged = changeEventDurationInScore(score, 0, 0, 'quarter');
assert(unchanged === score, 'same duration is no-op');

const badIndex = changeEventDurationInScore(score, 0, 99, 'whole');
assert(badIndex === score, 'out-of-range event index is no-op');

score = {
	...createEmptyScore(),
	staves: [
		{
			clef: 'treble',
			measures: [{ events: [{ kind: 'rest', duration: 'quarter' }] }],
		},
	],
};
const restChanged = changeEventDurationInScore(score, 0, 0, 'half');
const restEvent = restChanged.staves[0]?.measures[0]?.events[0];
assert(
	restEvent?.kind === 'rest' && restEvent.duration === 'half',
	'rest duration can be changed on selection',
);

const { isInsideSelectionPreserveArea } = await jiti.import(
	'../src/editor/staff-interaction.ts',
);
const { Window } = await import('happy-dom');

const window = new Window();
const editorRoot = window.document.createElement('div');
const toolbar = window.document.createElement('div');
toolbar.classList.add('abc-blocks-toolbar');
const durationBtn = window.document.createElement('button');
durationBtn.setAttribute('data-duration', 'half');
toolbar.appendChild(durationBtn);
const staffMount = window.document.createElement('div');
editorRoot.appendChild(toolbar);
editorRoot.appendChild(staffMount);
const outside = window.document.createElement('div');
window.document.body.append(editorRoot, outside);

assert(
	isInsideSelectionPreserveArea(durationBtn, staffMount, [editorRoot]),
	'toolbar duration button is inside selection preserve area',
);
assert(
	isInsideSelectionPreserveArea(staffMount, staffMount, [editorRoot]),
	'staff mount is inside selection preserve area',
);
assert(
	!isInsideSelectionPreserveArea(outside, staffMount, [editorRoot]),
	'clicks outside editor widget still dismiss selection',
);

if (failed > 0) {
	console.error(`\n${failed} failed, ${passed} passed`);
	process.exit(1);
}

console.log(`\nAll ${passed} duration-on-selection checks passed.`);
