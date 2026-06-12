/**
 * Invalid ABC (prose in music line) must not render as notation — fallback path only.
 * Run: npm run test:abc-invalid-fallback
 */
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';

const jiti = createJiti(import.meta.url);
const { renderAbcToElement } = await jiti.import('../src/renderer/abcjs-adapter.ts');
const { abcSourceHasUnsupportedSymbols } = await jiti.import(
	'../src/renderer/abc-render-validity.ts',
);

const invalidAbc = `X:1
M:4/4
K:C
not valid abc music`;

const validAbc = `X:1
M:4/4
L:1/4
K:C
CDEF|GABc|`;

if (!abcSourceHasUnsupportedSymbols(invalidAbc)) {
	console.error('FAIL: invalid ABC should flag unsupported symbols');
	process.exit(1);
}

if (abcSourceHasUnsupportedSymbols(validAbc)) {
	console.error('FAIL: valid ABC should not flag unsupported symbols');
	process.exit(1);
}

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;

const mount = window.document.createElement('div');
mount.empty = () => {
	mount.innerHTML = '';
};
window.document.body.appendChild(mount);

const invalidResult = renderAbcToElement(mount, invalidAbc);
if (invalidResult.ok) {
	console.error('FAIL: invalid ABC should not render successfully');
	process.exit(1);
}

mount.innerHTML = '';
const validResult = renderAbcToElement(mount, validAbc);
if (!validResult.ok) {
	console.error('FAIL: valid ABC should render successfully');
	console.error('error:', validResult.error);
	process.exit(1);
}

console.log('OK: invalid ABC uses fallback path; valid ABC still renders');
