/**
 * Phase 4.5 integration tests: multi-block Live Preview identity, read, and sync paths.
 * Simulates processor mount order and two-embed DOM — gaps unit tests do not cover.
 *
 * Note: the `obsidian` npm package is types-only (no runtime TFile/MarkdownView), so
 * editor-buffer paths are tested via pure markdown helpers that mirror sync.ts logic.
 * Real Obsidian LP behavior still needs manual reload or future E2E (wdio-obsidian-service).
 *
 * Run: npm run test:phase-4.5
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { Window } from 'happy-dom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const fixturePath = join(repoRoot, 'tests/fixtures/phase-4.5-two-block.md');
const expectedPath = join(repoRoot, 'tests/expected/phase-4.5-initial-open.json');

const jiti = createJiti(import.meta.url);
const {
	findAllAbcBlockFenceOpenLines,
	openLineForAbcBlockIndex,
	resolveAbcBlockIdentity,
	replaceAbcBlockBodyInMarkdown,
	extractAbcBlockBodyAtOpenLine,
} = await jiti.import('../src/editor/abc-block-patch.ts');
const {
	abcHasMusicLines,
	extractAllAbcBlockBodies,
	isEmptyAbcBlockSource,
	readAbcBodyAtBlockIndex,
	readAbcBodyAtFenceLine,
} = await jiti.import('../src/plugin/block-source.ts');
const {
	claimAbcBlockRenderOrdinal,
	noteAbcBlockSectionLineStart,
} = await jiti.import('../src/plugin/block-ordinal.ts');
const {
	findEmbedHostContainingProcessor,
	isAbcEmbedHostCountReliable,
	listAbcBlockEmbedHosts,
} = await jiti.import('../src/plugin/block-dom.ts');
const { buildLpEmbedSnapshotFromDom } = await jiti.import(
	'../src/plugin/lp-embed-snapshot.ts',
);
const { resolveLpProcessorIdentity } = await jiti.import(
	'../src/plugin/lp-processor-identity.ts',
);
const {
	ABC_BLOCK_INDEX_ATTR,
	ABC_OPEN_LINE_ATTR,
	readPersistedBlockIndex,
	writePersistedBlockIdentityToShellAndProcessor,
} = await jiti.import('../src/plugin/block-identity.ts');
const {
	createPhase41TestScore,
	resolveSyncBlockOpenLine,
	scoreToAbcBody,
} = await jiti.import('../src/editor/sync.ts');

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

const TWO_BLOCK_MARKDOWN = readFileSync(fixturePath, 'utf8');
const EXPECTED = JSON.parse(readFileSync(expectedPath, 'utf8'));
const PHASE41_BODY = scoreToAbcBody(createPhase41TestScore());

/** Pure sync write: same targeting as applyAbcBodyToDocument when blockIndex is set. */
function simulateSyncWrite(markdown, blockIndex, blockOpenLine, abcBody) {
	const openLine = resolveSyncBlockOpenLine(markdown, {
		blockIndex,
		blockOpenLine,
	});
	if (openLine === null) {
		return null;
	}
	return replaceAbcBlockBodyInMarkdown(markdown, openLine, abcBody);
}

/** Pure read path: same as resolveAbcBlockSourceAsync when blockIndex is known. */
function resolveSourceByBlockIndex(markdown, blockIndex) {
	return readAbcBodyAtBlockIndex(markdown, blockIndex) ?? '';
}

/** DOM index mapping used by resolvePreviewBlockIdentity when embed count is reliable. */
function resolveDomBlockIdentity(previewRoot, processorEl, markdown) {
	const openLines = findAllAbcBlockFenceOpenLines(markdown);
	const hosts = listAbcBlockEmbedHosts(previewRoot);
	const host = findEmbedHostContainingProcessor(previewRoot, processorEl);
	if (host && isAbcEmbedHostCountReliable(hosts.length, openLines.length)) {
		const blockIndex = hosts.indexOf(host);
		const openLine = openLines[blockIndex];
		if (blockIndex >= 0 && openLine !== undefined) {
			return { blockIndex, openLine };
		}
	}
	return null;
}

function buildTwoBlockPreviewDom(window) {
	const previewRoot = window.document.createElement('div');
	previewRoot.className = 'markdown-source-view';
	const hosts = [];

	for (let i = 0; i < 2; i++) {
		const host = window.document.createElement('div');
		host.className = 'cm-embed-block cm-language-abc';
		const processor = window.document.createElement('div');
		processor.className = 'abc-blocks-processor';
		host.appendChild(processor);
		previewRoot.appendChild(host);
		hosts.push({ host, processor });
	}

	return { previewRoot, hosts };
}

function resolveProcessorPass(markdown, previewRoot, processorEl, processorSource, renderOrdinal) {
	return (
		resolveAbcBlockIdentity(markdown, null, processorSource, renderOrdinal) ??
		resolveDomBlockIdentity(previewRoot, processorEl, markdown)
	);
}

// --- Fixture structure -------------------------------------------------------

const openLines = findAllAbcBlockFenceOpenLines(TWO_BLOCK_MARKDOWN);
assert(openLines.length === EXPECTED.fenceCount, 'fixture has two abc fences');
assert(openLines[0] === 2, 'first fence opens at line 2');
assert(openLines[1] === 10, 'second fence opens at line 10');

const block0Body = readAbcBodyAtBlockIndex(TWO_BLOCK_MARKDOWN, 0);
const block1Body = readAbcBodyAtBlockIndex(TWO_BLOCK_MARKDOWN, 1);
assert(block0Body?.includes('CDEF|'), 'block 0 body contains CDEF|');
assert(block1Body === '', 'block 1 body is empty');
assert(!isEmptyAbcBlockSource(block0Body ?? ''), 'block 0 is not empty');
assert(isEmptyAbcBlockSource(block1Body ?? ''), 'block 1 is empty');

// --- Expected JSON contract --------------------------------------------------

for (const block of EXPECTED.blocks) {
	const body = readAbcBodyAtBlockIndex(TWO_BLOCK_MARKDOWN, block.blockIndex);
	if (block.isEmpty) {
		assert(isEmptyAbcBlockSource(body ?? ''), `expected block ${block.blockIndex} empty`);
	} else {
		assert(
			block.bodyContains ? body?.includes(block.bodyContains) : true,
			`expected block ${block.blockIndex} contains ${block.bodyContains}`,
		);
		assert(
			abcHasMusicLines(body ?? '') === block.hasMusic,
			`expected block ${block.blockIndex} hasMusic=${block.hasMusic}`,
		);
	}
}

// --- Identity resolution (no DOM) --------------------------------------------

const filledProcessorSource = `X:1
M:4/4
L:1/4
K:C
CDEF|`;
const emptyProcessorSource = '';

assert(
	resolveAbcBlockIdentity(TWO_BLOCK_MARKDOWN, null, filledProcessorSource, 0)?.blockIndex === 0,
	'filled processor body resolves block 0',
);
assert(
	resolveAbcBlockIdentity(TWO_BLOCK_MARKDOWN, null, emptyProcessorSource, 1)?.blockIndex === 1,
	'empty processor at ordinal 1 resolves block 1',
);
assert(
	resolveAbcBlockIdentity(TWO_BLOCK_MARKDOWN, null, emptyProcessorSource, 0)?.blockIndex === 1,
	'empty processor at ordinal 0 maps to sole empty fence (block 1)',
);

const ordinalPath = 'phase-4.5/multi-block.md';
noteAbcBlockSectionLineStart(ordinalPath, openLines[0]);
noteAbcBlockSectionLineStart(ordinalPath, openLines[1]);
assert(claimAbcBlockRenderOrdinal(ordinalPath) === 0, 'first processor claim is ordinal 0');

const ambiguous = new Set([openLines[0], openLines[1]]);
assert(
	resolveAbcBlockIdentity(TWO_BLOCK_MARKDOWN, null, emptyProcessorSource, 0, ambiguous)
		?.blockIndex === 1,
	'inverted pass: empty processor maps to empty fence by body not ordinal',
);
assert(claimAbcBlockRenderOrdinal(ordinalPath) === 1, 'second processor claim is ordinal 1');
assert(
	resolveAbcBlockIdentity(TWO_BLOCK_MARKDOWN, null, filledProcessorSource, 1, ambiguous)
		?.blockIndex === 0,
	'inverted pass: filled processor at ordinal 1 maps to music fence',
);
await new Promise((resolve) => setTimeout(resolve, 0));
claimAbcBlockRenderOrdinal(ordinalPath);

// --- Index-based read (no sibling bleed) -------------------------------------

const bleedRead = readAbcBodyAtFenceLine(TWO_BLOCK_MARKDOWN, openLines[1], filledProcessorSource);
assert(bleedRead === '', 'read at empty fence line ignores filled processor fallback');
assert(resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, 0).includes('CDEF|'), 'index 0 source has CDEF|');
assert(resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, 1) === '', 'index 1 source is empty');

// --- Two-embed DOM (happy-dom) -----------------------------------------------

const window = new Window();
globalThis.HTMLElement = window.HTMLElement;
// Obsidian DOM nodes expose instanceOf(); happy-dom does not — polyfill for LP DOM tests.
if (typeof window.HTMLElement.prototype.instanceOf !== 'function') {
	window.HTMLElement.prototype.instanceOf = function (type) {
		return this instanceof type;
	};
}
const { previewRoot, hosts } = buildTwoBlockPreviewDom(window);

assert(hosts.length === 2, 'DOM scaffold has two embed hosts');
assert(
	isAbcEmbedHostCountReliable(hosts.length, openLines.length),
	'two hosts for two fences is reliable mapping',
);

const domPass0 = resolveProcessorPass(
	TWO_BLOCK_MARKDOWN,
	previewRoot,
	hosts[0].processor,
	filledProcessorSource,
	0,
);
const domPass1 = resolveProcessorPass(
	TWO_BLOCK_MARKDOWN,
	previewRoot,
	hosts[1].processor,
	emptyProcessorSource,
	1,
);
assert(domPass0?.blockIndex === 0, 'DOM pass: block 0 identity index 0');
assert(
	resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, domPass0.blockIndex).includes('CDEF|'),
	'DOM pass: block 0 resolved source has CDEF|',
);
assert(domPass1?.blockIndex === 1, 'DOM pass: block 1 identity index 1');
assert(
	resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, domPass1.blockIndex) === '',
	'DOM pass: block 1 resolved source is empty',
);

const invDom = buildTwoBlockPreviewDom(window);
const invFirst = resolveProcessorPass(
	TWO_BLOCK_MARKDOWN,
	invDom.previewRoot,
	invDom.hosts[1].processor,
	emptyProcessorSource,
	0,
);
const invSecond = resolveProcessorPass(
	TWO_BLOCK_MARKDOWN,
	invDom.previewRoot,
	invDom.hosts[0].processor,
	filledProcessorSource,
	1,
);
assert(invFirst?.blockIndex === 1, 'empty processor maps to block 1 regardless of host');
assert(
	resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, invFirst.blockIndex) === '',
	'empty processor reads empty fence body',
);
assert(invSecond?.blockIndex === 0, 'filled processor maps to block 0 regardless of host');
assert(
	resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, invSecond.blockIndex).includes('CDEF|'),
	'filled processor reads CDEF fence body',
);

const bodyMatchWinsDom = resolveProcessorPass(
	TWO_BLOCK_MARKDOWN,
	previewRoot,
	hosts[1].processor,
	filledProcessorSource,
	0,
);
assert(bodyMatchWinsDom?.blockIndex === 0, 'processor body match wins over DOM host index');
assert(
	resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, bodyMatchWinsDom.blockIndex).includes('CDEF|'),
	'filled processor on second host still reads first fence ABC',
);

const siblingTrap = window.document.createElement('div');
siblingTrap.className = 'markdown-source-view';
const hostA = window.document.createElement('div');
hostA.className = 'cm-embed-block cm-language-abc';
const hostB = window.document.createElement('div');
hostB.className = 'cm-embed-block cm-language-abc';
const processorInB = window.document.createElement('div');
hostB.appendChild(processorInB);
siblingTrap.appendChild(hostA);
siblingTrap.appendChild(hostB);
assert(
	findEmbedHostContainingProcessor(siblingTrap, processorInB) === hostB,
	'embed host is the one that contains the processor (sibling hosts)',
);

// --- Sync: blockIndex 0 write touches only fence 0 ---------------------------

const syncOpenLine0 = openLineForAbcBlockIndex(TWO_BLOCK_MARKDOWN, 0);
assert(syncOpenLine0 === openLines[0], 'sync open line for index 0');

const patched = simulateSyncWrite(TWO_BLOCK_MARKDOWN, 0, openLines[0], PHASE41_BODY);
assert(patched?.includes('CDEF|GABc|'), 'sync write block 0 adds phase 4.2 test ABC');
const bodiesAfterPatch = extractAllAbcBlockBodies(patched);
assert(bodiesAfterPatch.length === 2, 'still two blocks after sync write');
assert(
	isEmptyAbcBlockSource(bodiesAfterPatch[1] ?? ''),
	'block 1 stays empty after block 0 sync write',
);

const wrongLine = resolveSyncBlockOpenLine(TWO_BLOCK_MARKDOWN, {
	blockIndex: 0,
	blockOpenLine: openLines[1],
});
assert(wrongLine === openLines[0], 'blockIndex wins over stale blockOpenLine on sync resolve');

const block0After = extractAbcBlockBodyAtOpenLine(patched, openLines[0]);
const block1After = extractAbcBlockBodyAtOpenLine(patched, openLines[1]);
assert(block0After?.includes('GABc'), 'after sync, block 0 has GABc');
assert(isEmptyAbcBlockSource(block1After ?? ''), 'after sync, block 1 still empty');

if (EXPECTED.block0WriteTestBodyContains) {
	assert(
		block0After?.includes(EXPECTED.block0WriteTestBodyContains),
		`block 0 contains expected write marker ${EXPECTED.block0WriteTestBodyContains}`,
	);
}

// --- LP inline source edit: processor attrs without shell --------------------

function resolveLpIdentityInTest(
	markdown,
	processorEl,
	processorSource,
	renderOrdinal,
	previewRoot,
) {
	const snapshot = buildLpEmbedSnapshotFromDom(markdown, previewRoot, processorEl);
	return resolveLpProcessorIdentity({
		snapshot,
		persistedBlockIndex: readPersistedBlockIndex(processorEl),
		sectionInfo: null,
		processorSource,
		renderOrdinal,
		ambiguousSectionLineStarts: new Set(),
	});
}

const inlineEditProcessor = window.document.createElement('div');
inlineEditProcessor.setAttribute(ABC_BLOCK_INDEX_ATTR, '0');
inlineEditProcessor.setAttribute(ABC_OPEN_LINE_ATTR, String(openLines[0]));
const twoEmptyMarkdown = `# Multi-block test

\`\`\`abc

\`\`\`

\`\`\`abc

\`\`\`
`;
const twoEmptyOpenLines = findAllAbcBlockFenceOpenLines(twoEmptyMarkdown);
const twoEmptyDom = buildTwoBlockPreviewDom(window);
const staleIndexProcessor = twoEmptyDom.hosts[1].processor;
staleIndexProcessor.setAttribute(ABC_BLOCK_INDEX_ATTR, '0');
staleIndexProcessor.setAttribute(ABC_OPEN_LINE_ATTR, String(twoEmptyOpenLines[0]));
const twoEmptyIdentity = resolveLpIdentityInTest(
	twoEmptyMarkdown,
	staleIndexProcessor,
	emptyProcessorSource,
	0,
	twoEmptyDom.previewRoot,
);
assert(
	twoEmptyIdentity?.blockIndex === 1,
	'two empty fences: DOM embed index overrides stale persisted index 0 on block 1',
);

const inlineIdentity = resolveLpIdentityInTest(
	TWO_BLOCK_MARKDOWN,
	inlineEditProcessor,
	emptyProcessorSource,
	1,
	previewRoot,
);
assert(
	inlineIdentity?.blockIndex === 0,
	'LP inline edit: persisted processor index used without shell (not ordinal remap)',
);
assert(
	resolveSourceByBlockIndex(TWO_BLOCK_MARKDOWN, inlineIdentity.blockIndex).includes('CDEF|'),
	'LP inline edit: index 0 still reads CDEF fence after shell teardown',
);

const inlineEditBlock1 = window.document.createElement('div');
inlineEditBlock1.setAttribute(ABC_BLOCK_INDEX_ATTR, '1');
inlineEditBlock1.setAttribute(ABC_OPEN_LINE_ATTR, String(openLines[1]));
const inlineIdentity1 = resolveLpIdentityInTest(
	TWO_BLOCK_MARKDOWN,
	inlineEditBlock1,
	filledProcessorSource,
	0,
	previewRoot,
);
assert(
	inlineIdentity1?.blockIndex === 1,
	'LP inline edit: block 1 processor keeps index 1 when sibling is being edited',
);

// --- Persisted identity: processor first, reconcile keeps both in sync -------

const processor = window.document.createElement('div');
processor.setAttribute(ABC_BLOCK_INDEX_ATTR, '0');
const root = window.document.createElement('div');
root.className = 'abc-blocks-root';
const shell = window.document.createElement('div');
shell.className = 'abc-blocks-live-preview';
processor.appendChild(root);
root.appendChild(shell);
writePersistedBlockIdentityToShellAndProcessor(shell, 1, openLines[1]);
assert(
	readPersistedBlockIndex(processor) === 1,
	'reconcile syncs processor and shell to the same block index',
);

processor.setAttribute(ABC_BLOCK_INDEX_ATTR, '1');
shell.setAttribute(ABC_BLOCK_INDEX_ATTR, '0');
assert(
	readPersistedBlockIndex(processor) === 1,
	'processor block index wins over stale shell attr',
);

// Processor-time read: when blockIndex is known, always use index read (code-block.ts).
function resolveProcessorAbcSource(markdown, blockIndex, blockOpenLine, processorSource) {
	if (blockIndex !== null) {
		const fromIndex = readAbcBodyAtBlockIndex(markdown, blockIndex);
		if (fromIndex !== null) {
			return fromIndex;
		}
	}
	if (blockOpenLine !== null) {
		return readAbcBodyAtFenceLine(markdown, blockOpenLine, processorSource);
	}
	return processorSource;
}

assert(
	resolveProcessorAbcSource(TWO_BLOCK_MARKDOWN, 0, openLines[0], emptyProcessorSource).includes(
		'CDEF|',
	),
	'processor path blockIndex 0 returns fence 0 ABC not sibling bleed',
);
assert(
	resolveProcessorAbcSource(TWO_BLOCK_MARKDOWN, 1, openLines[1], filledProcessorSource) === '',
	'processor path blockIndex 1 returns empty fence',
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
