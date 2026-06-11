/**
 * Phase 5.6: key/time header mutations and toolbar controls.
 * Run: npm run test:key-time-controls
 */
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';

const jiti = createJiti(import.meta.url);
const { createEmptyScore } = await jiti.import('../src/model/score.ts');
const { setKeySignature, setTimeSignature } = await jiti.import(
	'../src/editor/score-header-mutations.ts',
);
const { parseAbc } = await jiti.import('../src/serializer/abc-parser.ts');
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');
const {
	scoreToDisplayAbc,
	placeNoteInScore,
} = await jiti.import('../src/editor/score-session.ts');
const {
	KEY_SIGNATURE_OPTIONS,
	TIME_SIGNATURE_OPTIONS,
	mountKeyTimeControls,
} = await jiti.import('../src/editor/key-time-controls.ts');

function ok(message) {
	console.log(`OK: ${message}`);
}

function fail(message) {
	console.error(`FAIL: ${message}`);
	process.exit(1);
}

const empty = createEmptyScore();
const withKeyG = setKeySignature(empty, 'G');
if (withKeyG.keySignature !== 'G') {
	fail('setKeySignature updates key');
}
if (setKeySignature(withKeyG, 'G') === withKeyG) {
	ok('setKeySignature is no-op when unchanged');
}

const withTime34 = setTimeSignature(withKeyG, '3/4');
if (withTime34.timeSignature !== '3/4') {
	fail('setTimeSignature updates time');
}

const abc = writeAbc(withTime34);
if (!abc.includes('K:G') || !abc.includes('M:3/4')) {
	fail(`writeAbc emits headers: ${abc}`);
}
ok('writeAbc round-trip headers');

const parsed = parseAbc(abc);
if (parsed.score?.keySignature !== 'G' || parsed.score?.timeSignature !== '3/4') {
	fail('parseAbc reads K/M headers');
}
ok('parseAbc round-trip headers');

const shellAbc = scoreToDisplayAbc(withTime34);
if (!shellAbc.includes('K:G') || !shellAbc.includes('M:3/4') || !shellAbc.endsWith('|')) {
	fail(`empty score display uses score headers: ${shellAbc}`);
}
ok('scoreToDisplayAbc uses score headers for empty staff shell');

const noted = placeNoteInScore(withTime34, 0, { step: 'C', octave: 3 }, 'quarter');
const notedAbc = writeAbc(noted);
if (!notedAbc.includes('K:G') || !notedAbc.includes('M:3/4')) {
	fail('noted score keeps header mutations in ABC');
}
ok('header mutations persist with note events');

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLSelectElement = window.HTMLSelectElement;

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
	el.createDiv = function createDiv({ cls, attr, text } = {}) {
		const child = this.ownerDocument.createElement('div');
		if (cls) {
			const classes = Array.isArray(cls) ? cls : [cls];
			child.classList.add(...classes);
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

const toolbar = patchObsidianElement(window.document.createElement('div'));
let currentScore = createEmptyScore();
const scheduled = [];

mountKeyTimeControls(toolbar, {
	getScore: () => currentScore,
	onScoreChange: (score) => {
		currentScore = score;
	},
	getSyncContext: async () => ({
		app: {},
		sourcePath: 'Test.md',
		blockOpenLine: 0,
		blockIndex: 0,
	}),
	scheduler: {
		schedule(fn) {
			scheduled.push(fn);
		},
	},
});

const keySelect = toolbar.querySelector('select[aria-label="Key signature"]');
const timeSelect = toolbar.querySelector('select[aria-label="Time signature"]');
if (!keySelect || !timeSelect) {
	fail('key/time selects mounted');
}

if (keySelect.options.length !== KEY_SIGNATURE_OPTIONS.length) {
	fail('key select option count');
}
if (timeSelect.options.length !== TIME_SIGNATURE_OPTIONS.length) {
	fail('time select option count');
}

keySelect.value = 'F';
keySelect.dispatchEvent(new window.Event('change', { bubbles: true }));
if (currentScore.keySignature !== 'F') {
	fail('key select change updates score');
}
ok('key select updates score');

timeSelect.value = '2/4';
timeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
if (currentScore.timeSignature !== '2/4') {
	fail('time select change updates score');
}
ok('time select updates score');

await new Promise((resolve) => setTimeout(resolve, 0));
if (scheduled.length < 2) {
	fail(`expected sync schedule calls, got ${scheduled.length}`);
}
ok('header changes schedule debounced sync');

console.log('OK: key/time controls');
