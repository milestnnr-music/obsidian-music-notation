/**
 * Smoke check: blank lines inside ```abc fences are stripped before abcjs render.
 * Run: npm run test:abc-normalize
 */
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';
import abcjs from 'abcjs';

const jiti = createJiti(import.meta.url);
const { normalizeAbcBlockBody } = await jiti.import('../src/plugin/block-source.ts');
const { renderAbc } = abcjs;

const withBlanks = `X:1

M:4/4

L:1/4

K:C

CDEF|GABc|`;

const normalized = normalizeAbcBlockBody(withBlanks);
const expectedLines = ['X:1', 'M:4/4', 'L:1/4', 'K:C', 'CDEF|GABc|'];
const actualLines = normalized.split('\n');

if (actualLines.length !== expectedLines.length) {
	console.error(
		`FAIL: expected ${expectedLines.length} lines after normalize, got ${actualLines.length}`,
	);
	console.error('normalized:', JSON.stringify(normalized));
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

const tunes = renderAbc(notationEl, normalized, { staffwidth: 740 });
const svg = notationEl.querySelector('svg');
const paths = svg?.querySelectorAll('path').length ?? 0;

if (!svg || paths === 0) {
	console.error('FAIL: abcjs produced no notation paths after blank-line normalization');
	console.error('warning:', tunes[0]?.warnings?.[0]);
	process.exit(1);
}

console.log(`OK: normalized ${withBlanks.split('\n').length} lines → ${actualLines.length}, svg paths=${paths}`);
