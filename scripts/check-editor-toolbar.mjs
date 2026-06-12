/**
 * Phase 5.1: editor state defaults and toolbar mount in Live Preview widget.
 * Run: npm run test:editor-toolbar
 */
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';

const jiti = createJiti(import.meta.url);
const { createDefaultEditorState, EditorStateController } = await jiti.import(
	'../src/editor/editor-state.ts',
);
const { mountToolbar } = await jiti.import('../src/editor/toolbar.ts');
const { mountEditorWidget } = await jiti.import('../src/editor/editor-widget.ts');

const defaults = createDefaultEditorState();
if (defaults.duration !== 'quarter') {
	console.error(`FAIL: default duration expected quarter, got ${defaults.duration}`);
	process.exit(1);
}
if (defaults.accidental !== 'none') {
	console.error(`FAIL: default accidental expected none, got ${defaults.accidental}`);
	process.exit(1);
}
if (defaults.placementMode !== 'note') {
	console.error(`FAIL: default placementMode expected note, got ${defaults.placementMode}`);
	process.exit(1);
}

const controller = new EditorStateController();
const changes = [];
controller.subscribe((state) => changes.push({ ...state }));

controller.setDuration('eighth');
if (controller.getState().duration !== 'eighth') {
	console.error('FAIL: setDuration did not update state');
	process.exit(1);
}

controller.setAccidental('sharp');
if (controller.getState().accidental !== 'sharp') {
	console.error('FAIL: setAccidental did not select sharp');
	process.exit(1);
}

controller.setAccidental('sharp');
if (controller.getState().accidental !== 'none') {
	console.error('FAIL: toggling active accidental should clear to none');
	process.exit(1);
}

if (changes.length !== 3) {
	console.error(`FAIL: expected 3 state change notifications, got ${changes.length}`);
	process.exit(1);
}

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLButtonElement = window.HTMLButtonElement;

/** Minimal Obsidian HTMLElement helpers for happy-dom smoke tests. */
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
		this.classList.toggle(cls, active);
	};
	el.removeClass = function removeClass(...classes) {
		for (const cls of classes) {
			this.classList.remove(cls);
		}
	};
	el.setCssProps = function setCssProps(props) {
		for (const [key, value] of Object.entries(props)) {
			this.style[key] = value;
		}
	};
	el.setAttr = function setAttr(name, value) {
		this.setAttribute(name, value);
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

const mount = patchObsidianElement(window.document.createElement('div'));
window.document.body.appendChild(mount);

mountEditorWidget(mount, '', true);

const toolbar = mount.querySelector('.abc-blocks-toolbar');
if (!toolbar) {
	console.error('FAIL: mountEditorWidget did not render toolbar');
	process.exit(1);
}

const durationButtons = toolbar.querySelectorAll('[data-duration]');
if (durationButtons.length !== 4) {
	console.error(`FAIL: expected 4 duration buttons, got ${durationButtons.length}`);
	process.exit(1);
}

const quarterBtn = toolbar.querySelector('[data-duration="quarter"]');
if (!quarterBtn?.classList.contains('abc-blocks-toolbar-btn-active')) {
	console.error('FAIL: quarter duration should be active by default');
	process.exit(1);
}

const wholeBtn = toolbar.querySelector('[data-duration="whole"]');
const wholeIcon = wholeBtn?.querySelector(
	'.abc-blocks-toolbar-glyph-icon .abcjs-note, .abc-blocks-toolbar-glyph-icon .abc-blocks-toolbar-abcjs-glyph',
);
if (!wholeIcon) {
	console.error('FAIL: whole duration button should render abcjs or extracted glyph');
	process.exit(1);
}

const accidentalButtons = toolbar.querySelectorAll('[data-accidental]');
if (accidentalButtons.length !== 3) {
	console.error(`FAIL: expected 3 accidental buttons, got ${accidentalButtons.length}`);
	process.exit(1);
}

const staffMount = mount.querySelector('.abc-blocks-staff-mount');
if (!staffMount) {
	console.error('FAIL: mountEditorWidget did not render staff mount');
	process.exit(1);
}

const toolbarOnly = patchObsidianElement(window.document.createElement('div'));
const toolbarController = new EditorStateController();
mountToolbar(toolbarOnly, toolbarController);

const eighthBtn = toolbarOnly.querySelector('[data-duration="eighth"]');
eighthBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
if (toolbarController.getState().duration !== 'eighth') {
	console.error('FAIL: toolbar click did not update duration');
	process.exit(1);
}

const flatBtn = toolbarOnly.querySelector('[data-accidental="flat"]');
flatBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
if (toolbarController.getState().accidental !== 'flat') {
	console.error('FAIL: toolbar click did not update accidental');
	process.exit(1);
}

if (!eighthBtn?.classList.contains('abc-blocks-toolbar-btn-active')) {
	console.error('FAIL: eighth button should show active after click');
	process.exit(1);
}

console.log('OK: editor toolbar state and mount');
