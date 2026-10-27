/**
 * Compare Phase 4.5 probe output against tests/expected/phase-4.5-initial-open.json.
 *
 * Run: npm run compare:phase-4.5-probe
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const expectedPath = join(repoRoot, 'tests/expected/phase-4.5-initial-open.json');
const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
const vault =
	process.env.ABC_BLOCKS_DEV_VAULT ??
	join(home, 'Desktop/Ideas/Obsidian Dev Vault');

const verify = spawnSync('node', ['scripts/verify-test-note.mjs'], {
	cwd: repoRoot,
	stdio: 'inherit',
	env: { ...process.env, ABC_BLOCKS_DEV_VAULT: vault },
});
if (verify.status !== 0) {
	process.exit(verify.status ?? 1);
}

const candidates = [
	process.env.ABC_BLOCKS_PROBE_FILE,
	join(repoRoot, 'test-results', 'phase-45-probe.json'),
	join(vault, '.obsidian/plugins/abc-blocks/test-results/phase-45-probe.json'),
	join(vault, 'abc-blocks-probe', 'phase-45-probe.json'),
	join(vault, '.abc-blocks', 'phase-45-probe.json'),
].filter(Boolean);

const existing = candidates
	.filter((p) => existsSync(p))
	.map((p) => ({ path: p, mtime: statSync(p).mtimeMs }))
	.sort((a, b) => b.mtime - a.mtime);

const probePath = existing[0]?.path;
if (!probePath) {
	console.error('No probe file found. Reload Obsidian after npm run build, open Test.md in LP.');
	console.error('Expected:', join(repoRoot, 'test-results/phase-45-probe.json'));
	process.exit(1);
}

if (probePath.includes('.abc-blocks/phase-45-probe')) {
	console.warn(
		'WARN: using legacy .abc-blocks probe — delete it or reload so test-results/ is written',
	);
}

const probe = JSON.parse(readFileSync(probePath, 'utf8'));
const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
console.log(`Reading probe: ${probePath}`);

let failed = 0;

/** Count a probe mismatch and print it; the script exits later if any failed. */
function fail(msg) {
	console.error(`FAIL: ${msg}`);
	failed++;
}

/** Print a probe field that matched the expected snapshot. */
function ok(msg) {
	console.log(`OK: ${msg}`);
}

if (probe.probeSchemaVersion !== 2) {
	fail(
		`stale probe (schema v${probe.probeSchemaVersion ?? 'missing'}) — expect Notice mentioning test-results/phase-45-probe.json`,
	);
}

if (probe.pluginVersion && probe.pluginVersion < '0.1.2') {
	fail(`stale plugin in probe (${probe.pluginVersion})`);
}

if (!Array.isArray(probe.shells) || probe.shells.length === 0) {
	fail('probe has no shells — open Test.md in Live Preview after reload');
}

if (failed === 0 && !probe.fence0BodyPreview?.includes('CDEF|')) {
	fail(
		`editor buffer fence 0 missing CDEF| (got "${probe.fence0BodyPreview ?? ''}")`,
	);
} else if (failed === 0) {
	ok('editor buffer fence 0 contains CDEF|');
}

if (failed === 0 && probe.fence1BodyPreview && probe.fence1BodyPreview.trim().length > 0) {
	fail(`editor buffer fence 1 should be empty (got "${probe.fence1BodyPreview}")`);
} else if (failed === 0) {
	ok('editor buffer fence 1 is empty');
}

if (failed === 0 && Array.isArray(probe.shells)) {
	const sorted = [...probe.shells].sort(
		(a, b) => (a.blockIndex ?? 99) - (b.blockIndex ?? 99),
	);
	for (const block of expected.blocks) {
		const shell = sorted.find((s) => s.blockIndex === block.blockIndex);
		if (!shell) {
			fail(`no shell with blockIndex ${block.blockIndex}`);
			continue;
		}
		if (!('domEmbedIndex' in shell)) {
			fail(`stale shell entry for block ${block.blockIndex} — missing domEmbedIndex`);
			continue;
		}
		if (typeof shell.domEmbedIndex !== 'number') {
			fail(`block ${block.blockIndex} domEmbedIndex not resolved (null)`);
		} else if (shell.domEmbedIndex !== block.blockIndex) {
			fail(
				`block ${block.blockIndex} on wrong embed host (domEmbedIndex=${shell.domEmbedIndex})`,
			);
		} else {
			ok(`block ${block.blockIndex} domEmbedIndex matches blockIndex`);
		}
		if (shell.isEmpty !== block.isEmpty) {
			fail(
				`block ${block.blockIndex} isEmpty: got ${shell.isEmpty}, expected ${block.isEmpty}`,
			);
		} else {
			ok(`block ${block.blockIndex} isEmpty=${block.isEmpty}`);
		}
		if (block.hasMusic !== undefined && shell.hasMusic !== block.hasMusic) {
			fail(
				`block ${block.blockIndex} hasMusic: got ${shell.hasMusic}, expected ${block.hasMusic}`,
			);
		} else if (block.hasMusic !== undefined) {
			ok(`block ${block.blockIndex} hasMusic=${block.hasMusic}`);
		}
		if (block.bodyContains && !shell.resolvedSourcePreview.includes(block.bodyContains)) {
			fail(`block ${block.blockIndex} source preview missing "${block.bodyContains}"`);
		} else if (block.bodyContains) {
			ok(`block ${block.blockIndex} source contains ${block.bodyContains}`);
		}
		if (block.isEmpty && !shell.hasEmptyStaffShell) {
			console.warn(`WARN: block ${block.blockIndex} empty staff not in DOM yet (abcjs async)`);
		} else if (block.isEmpty) {
			ok(`block ${block.blockIndex} has empty staff shell`);
		}
	}
}

if (failed > 0) {
	console.log(`\n${failed} probe assertion(s) failed`);
	process.exit(1);
}

console.log('\nProbe matches expected initial-open contract.');
