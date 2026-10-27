/**
 * Phase 5.3: delete selected note from Score model.
 * Run: npm run test:note-delete
 */
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const { deleteNoteFromScore, placeNoteInScore, placeRestInScore } = await jiti.import(
	'../src/editor/score-session.ts',
);
const { createEmptyScore, scoreHasEvents } = await jiti.import('../src/model/score.ts');
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');

let passed = 0;
let failed = 0;

/** Record a pass or fail for one note-delete check without stopping the rest of the script. */
function assert(condition, message) {
	if (!condition) {
		console.error(`FAIL: ${message}`);
		failed++;
		return;
	}
	console.log(`OK: ${message}`);
	passed++;
}

const empty = createEmptyScore();
let score = placeNoteInScore(empty, 0, { step: 'C', octave: 3 }, 'quarter');
score = placeNoteInScore(score, 0, { step: 'D', octave: 3 }, 'quarter');
score = placeNoteInScore(score, 0, { step: 'E', octave: 3 }, 'quarter');

assert(
	score.staves[0]?.measures[0]?.events.length === 3,
	'fixture has three notes in measure 0',
);

const afterMiddle = deleteNoteFromScore(score, 0, 1);
const middleEvents = afterMiddle.staves[0]?.measures[0]?.events ?? [];
assert(middleEvents.length === 2, 'delete middle note leaves two events');
assert(
	middleEvents[0]?.kind === 'note' && middleEvents[0].pitches[0]?.step === 'C',
	'first note remains C',
);
assert(
	middleEvents[1]?.kind === 'note' && middleEvents[1].pitches[0]?.step === 'E',
	'third note E shifts to index 1',
);

const unchanged = deleteNoteFromScore(score, 0, 99);
assert(unchanged === score, 'out-of-range event index is no-op');

const unchangedMeasure = deleteNoteFromScore(score, 9, 0);
assert(unchangedMeasure === score, 'out-of-range measure index is no-op');

score = placeNoteInScore(createEmptyScore(), 1, { step: 'G', octave: 4 }, 'half');
assert(score.staves[0]?.measures.length === 2, 'fixture has two measures');
const trimmed = deleteNoteFromScore(score, 1, 0);
assert(trimmed.staves[0]?.measures.length === 1, 'trailing empty measure trimmed');
assert(
	trimmed.staves[0]?.measures[0]?.events.length === 0,
	'measure 0 empty after deleting only note in measure 1',
);

const lone = placeNoteInScore(createEmptyScore(), 0, { step: 'A', octave: 3 }, 'quarter');
const cleared = deleteNoteFromScore(lone, 0, 0);
assert(!scoreHasEvents(cleared), 'deleting only note yields score with no events');
assert(cleared.staves[0]?.measures.length === 1, 'one empty measure remains');

const withRest = placeRestInScore(createEmptyScore(), 0, 'quarter');
const afterRestDelete = deleteNoteFromScore(withRest, 0, 0);
assert(!scoreHasEvents(afterRestDelete), 'deleting only rest yields score with no events');

const abc = writeAbc(cleared);
assert(!abc.includes('a'), 'cleared score ABC has no note body');

const {
	NoteSelectionController,
	NOTE_SELECTED_ATTR,
	restoreAbcjsNoteAppearance,
	stripAllNoteVisualState,
} = await jiti.import('../src/editor/note-selection.ts');
const { Window } = await import('happy-dom');

const selWindow = new Window();
const selMount = selWindow.document.createElement('div');
selWindow.document.body.appendChild(selMount);
const selNote = selWindow.document.createElementNS(
	'http://www.w3.org/2000/svg',
	'g',
);
selNote.setAttribute('class', 'abcjs-note');
selNote.setAttribute('data-measure-index', '0');
selNote.setAttribute('data-event-index', '0');
selMount.appendChild(selNote);
const selController = new NoteSelectionController([selMount]);
selController.selectNote(selNote);
assert(
	selNote.getAttribute(NOTE_SELECTED_ATTR) === 'true',
	'selectNote sets data-abc-blocks-selected',
);
selController.clearAllVisualState();
assert(
	selNote.getAttribute(NOTE_SELECTED_ATTR) === null,
	'clearAllVisualState removes data-abc-blocks-selected',
);
assert(
	!selNote.getAttribute('class')?.includes('abc-blocks-note-selected'),
	'clearAllVisualState removes legacy selected class',
);

const svgRoot = selWindow.document.createElementNS(
	'http://www.w3.org/2000/svg',
	'svg',
);
svgRoot.setAttribute('fill', 'currentColor');
const abcjsNote = selWindow.document.createElementNS(
	'http://www.w3.org/2000/svg',
	'g',
);
abcjsNote.setAttribute('class', 'abcjs-note abcjs-note_selected');
const notehead = selWindow.document.createElementNS(
	'http://www.w3.org/2000/svg',
	'path',
);
notehead.setAttribute('fill', '#ff0000');
abcjsNote.appendChild(notehead);
svgRoot.appendChild(abcjsNote);
selMount.appendChild(svgRoot);
restoreAbcjsNoteAppearance(abcjsNote);
assert(
	notehead.getAttribute('fill') === 'currentColor',
	'restoreAbcjsNoteAppearance resets abcjs red notehead fill',
);
assert(
	!abcjsNote.getAttribute('class')?.includes('abcjs-note_selected'),
	'restoreAbcjsNoteAppearance removes abcjs-note_selected class',
);

abcjsNote.setAttribute(NOTE_SELECTED_ATTR, 'true');
abcjsNote.classList.add('abc-blocks-note-selected');
notehead.setAttribute('fill', '#ff0000');
stripAllNoteVisualState([selMount]);
assert(
	abcjsNote.getAttribute(NOTE_SELECTED_ATTR) === null,
	'stripAllNoteVisualState clears plugin selection attr',
);
assert(
	notehead.getAttribute('fill') === 'currentColor',
	'stripAllNoteVisualState restores abcjs notehead fill',
);

if (failed > 0) {
	console.error(`\n${failed} failed, ${passed} passed`);
	process.exit(1);
}

console.log(`\nAll ${passed} note-delete checks passed.`);
