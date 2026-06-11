/**
 * Phase 4.1 tests: locate and replace ```abc fence bodies in markdown.
 * Run: npm run test:abc-block-patch
 */
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const {
	findAbcBlockFenceRange,
	findAllAbcBlockFenceOpenLines,
	openLineForAbcBlockIndex,
	resolveAbcBlockIdentity,
	resolveOpenLineFromSectionRange,
	extractAbcBlockBodyAtOpenLine,
	replaceAbcBlockBodyInMarkdown,
	isAbcBlockBodyEmpty,
} = await jiti.import('../src/editor/abc-block-patch.ts');
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');
const { parseAbc } = await jiti.import('../src/serializer/abc-parser.ts');
const {
	claimAbcBlockRenderOrdinal,
	getAmbiguousSectionLineStarts,
	noteAbcBlockSectionLineStart,
} = await jiti.import('../src/plugin/block-ordinal.ts');
const { readAbcBodyAtBlockIndex, readAbcBodyAtFenceLine } = await jiti.import(
	'../src/plugin/block-source.ts',
);
const { isAbcEmbedHostCountReliable } = await jiti.import('../src/plugin/block-dom.ts');
const {
	readPersistedBlockIndex,
	writePersistedBlockIdentityToShellAndProcessor,
} = await jiti.import('../src/plugin/block-identity.ts');
const { Window } = await import('happy-dom');

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

const sampleAbc = `X:1
M:4/4
L:1/4
K:C
CDEF|GABc|`;

const emptyBlock = '```abc\n```';
const emptyWithWhitespace = '```abc\n   \n```';
const filledBlock = `\`\`\`abc\n${sampleAbc}\n\`\`\``;
const twoBlocks = `# Note

\`\`\`abc
X:1
K:C
C|
\`\`\`

More text

\`\`\`abc
X:1
K:G
G|
\`\`\`
`;

const emptyRange = findAbcBlockFenceRange(emptyBlock, null);
assert(emptyRange !== null, 'find range in empty block');
if (emptyRange) {
	assert(isAbcBlockBodyEmpty(emptyRange), 'empty block body is empty');
}

const filledRange = findAbcBlockFenceRange(filledBlock, null);
assert(filledRange !== null, 'find range in filled block');
if (filledRange) {
	assert(!isAbcBlockBodyEmpty(filledRange), 'filled block body is not empty');
}

const replacedEmpty = replaceAbcBlockBodyInMarkdown(emptyBlock, null, sampleAbc);
assert(
	replacedEmpty === `\`\`\`abc\n${sampleAbc}\n\`\`\``,
	'replace body in empty fence',
);

const replacedWhitespace = replaceAbcBlockBodyInMarkdown(
	emptyWithWhitespace,
	null,
	sampleAbc,
);
assert(
	replacedWhitespace?.includes('CDEF|GABc|'),
	'replace body in whitespace-only fence',
);

const openLines = findAllAbcBlockFenceOpenLines(twoBlocks);
assert(openLines.length === 2, 'finds two abc fence open lines');
assert(openLines[0] === 2, 'first block open line');
assert(openLines[1] === 10, 'second block open line');

assert(openLineForAbcBlockIndex(twoBlocks, 1) === 10, 'block index 1 maps to second fence');
assert(openLineForAbcBlockIndex(twoBlocks, 0) === 2, 'block index 0 maps to first fence');

const fromSectionRange = resolveOpenLineFromSectionRange(twoBlocks, {
	text: '```abc\nX:1\nK:G\nG|\n```',
	lineStart: 10,
	lineEnd: 14,
});
assert(fromSectionRange === 10, 'section line range finds opening fence');

const duplicateLineStart = new Set([10]);
const ambiguousIdentity = resolveAbcBlockIdentity(
	twoBlocks,
	{ text: '', lineStart: 5, lineEnd: 8 },
	'',
	0,
	duplicateLineStart,
);
assert(
	ambiguousIdentity === null,
	'section span without a fence does not guess multi-block identity',
);
assert(
	openLineForAbcBlockIndex(twoBlocks, 0) === 2,
	'block index 0 maps to first fence when section lineStart is ambiguous',
);

const block1Body = extractAbcBlockBodyAtOpenLine(twoBlocks, 2);
const block2Body = extractAbcBlockBodyAtOpenLine(twoBlocks, 10);
assert(block1Body === 'X:1\nK:C\nC|', 'extract first block body by open line');
assert(block2Body === 'X:1\nK:G\nG|', 'extract second block body by open line');

const secondBlockOpenLine = 10;
const secondBlockRange = findAbcBlockFenceRange(twoBlocks, secondBlockOpenLine);
assert(
	secondBlockRange?.openLine === secondBlockOpenLine,
	'line hint selects second block',
);

const secondReplaced = replaceAbcBlockBodyInMarkdown(
	twoBlocks,
	secondBlockOpenLine,
	sampleAbc,
);
assert(
	secondReplaced?.includes('CDEF|GABc|') && secondReplaced.includes('K:C\nC|'),
	'replace only targeted block in multi-block note',
);

const badHint = findAbcBlockFenceRange(twoBlocks, 99);
assert(badHint === null, 'unknown open line does not guess nearest block');

const ordinalPath = 'test/note.md';
noteAbcBlockSectionLineStart(ordinalPath, 10);
assert(claimAbcBlockRenderOrdinal(ordinalPath) === 0, 'first ordinal in pass is 0');
noteAbcBlockSectionLineStart(ordinalPath, 10);
assert(claimAbcBlockRenderOrdinal(ordinalPath) === 1, 'second ordinal in pass is 1');
assert(
	getAmbiguousSectionLineStarts(ordinalPath).has(10),
	'duplicate section line starts are ambiguous',
);
await new Promise((resolve) => setTimeout(resolve, 0));
assert(
	claimAbcBlockRenderOrdinal(ordinalPath) === 0,
	'ordinal resets after render pass',
);

const parsed = parseAbc(sampleAbc);
const written = writeAbc(parsed.score);
const roundTripReplace = replaceAbcBlockBodyInMarkdown(emptyBlock, null, written);
assert(
	roundTripReplace?.includes('CDEF|GABc|'),
	'writer output patches empty fence',
);

const staleLineBody = readAbcBodyAtFenceLine(twoBlocks, 99, '');
assert(staleLineBody === '', 'stale open line uses processor fallback, not sibling ABC');

const secondByLine = readAbcBodyAtFenceLine(twoBlocks, 10, 'SHOULD_NOT_USE');
assert(
	secondByLine === 'X:1\nK:G\nG|',
	'valid open line reads only that fence body',
);

assert(
	openLineForAbcBlockIndex(twoBlocks, 1) === 10,
	'block index 1 maps to second fence open line',
);
assert(
	openLineForAbcBlockIndex(twoBlocks, 0) === 2,
	'block index 0 maps to first fence open line',
);
assert(
	!isAbcEmbedHostCountReliable(1, 2),
	'one embed host for two fences is unreliable (inline source edit)',
);
assert(
	isAbcEmbedHostCountReliable(2, 2),
	'matching embed and fence counts are reliable',
);

const secondByIndex = readAbcBodyAtBlockIndex(twoBlocks, 1);
assert(secondByIndex === 'X:1\nK:G\nG|', 'block index 1 reads second fence body only');

const twoBlocksOneEmpty = `# Note

\`\`\`abc
X:1
K:C
C|
\`\`\`

\`\`\`abc

\`\`\`
`;
const filledProcessor = 'X:1\nK:C\nC|';
const emptyProcessor = '';
const idFilled = resolveAbcBlockIdentity(twoBlocksOneEmpty, null, filledProcessor, 0);
assert(idFilled?.blockIndex === 0, 'processor body match resolves first block');
const idEmptyAt1 = resolveAbcBlockIdentity(twoBlocksOneEmpty, null, emptyProcessor, 1);
assert(idEmptyAt1?.blockIndex === 1, 'empty processor at ordinal 1 resolves empty fence');
const idEmptyAt0 = resolveAbcBlockIdentity(twoBlocksOneEmpty, null, emptyProcessor, 0);
assert(idEmptyAt0?.blockIndex === 1, 'empty processor at ordinal 0 maps to sole empty fence');

const window = new Window();
globalThis.HTMLElement = window.HTMLElement;
const processor = window.document.createElement('div');
processor.setAttribute('data-abc-block-index', '0');
const root = window.document.createElement('div');
root.className = 'abc-blocks-root';
const shell = window.document.createElement('div');
shell.className = 'abc-blocks-live-preview';
processor.appendChild(root);
root.appendChild(shell);
writePersistedBlockIdentityToShellAndProcessor(shell, 1, 10);
assert(
	readPersistedBlockIndex(processor) === 1,
	'reconcile syncs processor and shell to the same block index',
);

processor.setAttribute('data-abc-block-index', '1');
shell.setAttribute('data-abc-block-index', '0');
assert(
	readPersistedBlockIndex(processor) === 1,
	'processor block index wins over stale shell attr',
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
