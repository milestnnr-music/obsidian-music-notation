/**
 * Phase 4.3 tests: first edit writes ABC to an empty fence only when score has events.
 * Run: npm run test:abc-first-edit
 */
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');
const {
	createEmptyScore,
	createFirstEditScore,
	scoreHasEvents,
} = await jiti.import('../src/model/score.ts');
const {
	isAbcBlockEmptyInMarkdown,
	scoreToAbcBody,
} = await jiti.import('../src/editor/sync.ts');
const { replaceAbcBlockBodyInMarkdown } = await jiti.import(
	'../src/editor/abc-block-patch.ts',
);

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

const emptyFence = '```abc\n```';
const filledFence = `\`\`\`abc
X:1
M:4/4
L:1/4
K:C
CDEF|GABc|
\`\`\``;

assert(isAbcBlockEmptyInMarkdown(emptyFence, 0), 'empty fence detected at open line 0');
assert(
	!isAbcBlockEmptyInMarkdown(filledFence, 0),
	'filled fence is not empty',
);

const emptyScore = createEmptyScore();
const firstEditScore = createFirstEditScore();

assert(!scoreHasEvents(emptyScore), 'empty score has no events');
assert(scoreHasEvents(firstEditScore), 'first-edit score has events');

const emptyWritten = writeAbc(emptyScore);
assert(!emptyWritten.includes('CDEF'), 'empty score writer omits music line');

const firstEditWritten = scoreToAbcBody(firstEditScore);
assert(firstEditWritten.startsWith('X:1\nM:4/4\nL:1/4\nK:C\n'), 'first edit includes headers');
assert(firstEditWritten.includes('C'), 'first edit includes quarter C');
assert(firstEditWritten.includes('|'), 'first edit includes measure bar');

const patched = replaceAbcBlockBodyInMarkdown(emptyFence, 0, firstEditWritten);
assert(patched?.includes('X:1'), 'patch writes headers into empty fence');
assert(patched?.includes('K:C'), 'patch writes key into empty fence');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
