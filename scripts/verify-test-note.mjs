/**
 * Ensure dev vault Test.md matches the Phase 4.5 fixture (required for manual / probe tests).
 * Run: npm run verify:test-note
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const fixture = readFileSync(
	join(repoRoot, 'tests/fixtures/phase-4.5-two-block.md'),
	'utf8',
);
const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
const vault =
	process.env.ABC_BLOCKS_DEV_VAULT ??
	join(home, 'Desktop/Ideas/Obsidian Dev Vault');
const noteName = process.env.ABC_BLOCKS_TEST_NOTE ?? 'Test.md';
const notePath = join(vault, noteName);

if (!existsSync(notePath)) {
	console.error(`Missing test note: ${notePath}`);
	console.error('Run: npm run sync:test-note');
	process.exit(1);
}

const actual = readFileSync(notePath, 'utf8');
if (actual !== fixture) {
	console.error(`FAIL: ${notePath} does not match tests/fixtures/phase-4.5-two-block.md`);
	console.error('First fence must include CDEF|; second fence must be empty.');
	console.error('Run: npm run sync:test-note');
	console.error('Then reload Obsidian without saving (discard in-memory buffer if prompted).');
	process.exit(1);
}

console.log(`OK: ${notePath} matches Phase 4.5 fixture`);
