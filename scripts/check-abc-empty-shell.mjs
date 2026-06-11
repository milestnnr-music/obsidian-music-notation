/**
 * Smoke check: implicit default ABC renders an empty treble staff shell.
 * Run: npm run test:abc-empty-shell
 */
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';
import abcjs from 'abcjs';

const jiti = createJiti(import.meta.url);
const { getImplicitDefaultAbcShell } = await jiti.import('../src/serializer/abc-defaults.ts');
const { renderAbc } = abcjs;

const shellAbc = getImplicitDefaultAbcShell();
const expectedLines = ['X:1', 'M:4/4', 'L:1/4', 'K:C', '|'];
const actualLines = shellAbc.split('\n');

if (actualLines.length !== expectedLines.length) {
	console.error(
		`FAIL: expected ${expectedLines.length} shell lines, got ${actualLines.length}`,
	);
	process.exit(1);
}

for (let i = 0; i < expectedLines.length; i++) {
	if (actualLines[i] !== expectedLines[i]) {
		console.error(`FAIL: line ${i + 1} expected ${expectedLines[i]}, got ${actualLines[i]}`);
		process.exit(1);
	}
}

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;

const mount = window.document.createElement('div');
window.document.body.appendChild(mount);
const notationEl = window.document.createElement('div');
mount.appendChild(notationEl);

const tunes = renderAbc(notationEl, shellAbc, { staffwidth: 740 });
const svg = notationEl.querySelector('svg');
const paths = svg?.querySelectorAll('path').length ?? 0;

if (!svg || paths === 0) {
	console.error('FAIL: implicit default ABC did not render staff paths');
	console.error('warning:', tunes[0]?.warnings?.[0]);
	process.exit(1);
}

console.log(`OK: empty staff shell renders svg paths=${paths}`);
