/**
 * Phase 5.5: rest mode placement via toolbar + snap/measure.
 * Run: npm run test:rest-placement
 */
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';

const jiti = createJiti(import.meta.url);
const { placeRestInScore, placeNoteInScore } = await jiti.import(
	'../src/editor/score-session.ts',
);
const { annotateRenderedNotes } = await jiti.import('../src/editor/note-annotate.ts');
const { renderAbcToElement } = await jiti.import('../src/renderer/abcjs-adapter.ts');
const { createEmptyScore, scoreHasEvents } = await jiti.import('../src/model/score.ts');
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');
const { createDefaultEditorState, EditorStateController } = await jiti.import(
	'../src/editor/editor-state.ts',
);
const { mountToolbar } = await jiti.import('../src/editor/toolbar.ts');

let passed = 0;
let failed = 0;

function assert(condition, message) {
	if (!condition) {
		console.error(`FAIL: ${message}`);
		failed++;
		return;
	}
	console.log(`OK: ${message}`);
	passed++;
}

const defaults = createDefaultEditorState();
assert(defaults.placementMode === 'note', 'default placement mode is note');

const controller = new EditorStateController();
controller.toggleRestMode();
assert(controller.getState().placementMode === 'rest', 'toggleRestMode enables rest');
controller.toggleRestMode();
assert(controller.getState().placementMode === 'note', 'toggleRestMode returns to note');

let score = placeRestInScore(createEmptyScore(), 0, 'quarter');
assert(scoreHasEvents(score), 'placeRestInScore adds an event');
const rest = score.staves[0]?.measures[0]?.events[0];
assert(rest?.kind === 'rest' && rest.duration === 'quarter', 'rest is quarter in measure 0');

score = placeRestInScore(score, 1, 'half');
assert(score.staves[0]?.measures.length === 2, 'rest in measure 1 extends measures');
assert(
	score.staves[0]?.measures[1]?.events[0]?.kind === 'rest',
	'second measure holds the rest',
);

score = placeNoteInScore(createEmptyScore(), 0, { step: 'E', octave: 3 }, 'quarter');
score = placeRestInScore(score, 0, 'eighth');
const events = score.staves[0]?.measures[0]?.events ?? [];
assert(events.length === 2, 'note then rest append in same measure');
assert(events[0]?.kind === 'note', 'note stays first');
assert(events[1]?.kind === 'rest' && events[1].duration === 'eighth', 'rest appends after note');

const abc = writeAbc(score);
assert(/z/.test(abc), 'ABC contains rest symbol');

const annotateWindow = new Window();
globalThis.window = annotateWindow;
globalThis.document = annotateWindow.document;
globalThis.HTMLElement = annotateWindow.HTMLElement;
const annotateMount = annotateWindow.document.createElement('div');
annotateMount.empty = () => {
	annotateMount.innerHTML = '';
};
annotateWindow.document.body.appendChild(annotateMount);
renderAbcToElement(annotateMount, abc);
const annotateSvg = annotateMount.querySelector('svg');
assert(annotateSvg !== null, 'mixed score renders svg for annotation');
annotateRenderedNotes(annotateSvg, score);
const restEl = annotateSvg.querySelector('.abcjs-rest');
assert(restEl?.getAttribute('data-measure-index') === '0', 'rest gets data-measure-index');
assert(restEl?.getAttribute('data-event-index') === '1', 'rest gets data-event-index in mixed measure');

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLButtonElement = window.HTMLButtonElement;

function patchObsidianElement(el) {
	if (typeof el.empty === 'function') {
		return el;
	}
	el.empty = function empty() {
		this.innerHTML = '';
	};
	el.addClass = function addClass(...classes) {
		for (const cls of classes) {
			this.classList.add(cls);
		}
	};
	el.toggleClass = function toggleClass(cls, active) {
		if (active === undefined) {
			this.classList.toggle(cls);
			return;
		}
		this.classList.toggle(cls, active);
	};
	el.setAttr = function setAttr(name, value) {
		this.setAttribute(name, value);
	};
	el.createDiv = function createDiv({ cls, attr, text } = {}) {
		const child = this.ownerDocument.createElement('div');
		if (cls) {
			child.classList.add(...(Array.isArray(cls) ? cls : [cls]));
		}
		if (attr) {
			for (const [name, value] of Object.entries(attr)) {
				child.setAttribute(name, value);
			}
		}
		if (text) {
			child.textContent = text;
		}
		patchObsidianElement(child);
		this.appendChild(child);
		return child;
	};
	el.createSpan = function createSpan({ cls, text } = {}) {
		const child = this.ownerDocument.createElement('span');
		if (cls) {
			child.classList.add(cls);
		}
		if (text) {
			child.textContent = text;
		}
		patchObsidianElement(child);
		this.appendChild(child);
		return child;
	};
	el.createEl = function createEl(tag, { cls, text, attr } = {}) {
		const child = this.ownerDocument.createElement(tag);
		if (cls) {
			child.classList.add(cls);
		}
		if (text) {
			child.textContent = text;
		}
		if (attr) {
			for (const [name, value] of Object.entries(attr)) {
				child.setAttribute(name, value);
			}
		}
		patchObsidianElement(child);
		this.appendChild(child);
		return child;
	};
	return el;
}

const toolbarMount = patchObsidianElement(window.document.createElement('div'));
const toolbarState = new EditorStateController();
mountToolbar(toolbarMount, toolbarState);

const restBtn = toolbarMount.querySelector('.abc-blocks-toolbar-rest');
assert(restBtn !== null, 'toolbar renders rest mode button');
const restGlyph = restBtn?.querySelector(
	'.abc-blocks-toolbar-glyph-icon .abcjs-rest, .abc-blocks-toolbar-glyph-icon .abc-blocks-toolbar-abcjs-glyph',
);
assert(restGlyph !== null, 'rest button renders abcjs quarter-rest glyph');

restBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(toolbarState.getState().placementMode === 'rest', 'rest button toggles rest mode');
assert(
	toolbarMount.classList.contains('abc-blocks-toolbar-rest-mode'),
	'toolbar gets rest-mode class',
);

if (failed > 0) {
	console.error(`\n${failed} failed, ${passed} passed`);
	process.exit(1);
}

console.log(`\nAll ${passed} rest-placement checks passed.`);
