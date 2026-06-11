/**
 * Copy the Phase 4.5 two-block fixture into the dev vault for manual / E2E testing.
 *
 * Run: npm run sync:test-note
 * Env: ABC_BLOCKS_DEV_VAULT (default: ~/Desktop/Ideas/Obsidian Dev Vault)
 *      ABC_BLOCKS_TEST_NOTE (default: Test.md)
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const fixture = join(repoRoot, 'tests/fixtures/phase-4.5-two-block.md');

const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
const vault =
	process.env.ABC_BLOCKS_DEV_VAULT ??
	join(home, 'Desktop/Ideas/Obsidian Dev Vault');
const noteName = process.env.ABC_BLOCKS_TEST_NOTE ?? 'Test.md';
const target = join(vault, noteName);

mkdirSync(vault, { recursive: true });
copyFileSync(fixture, target);
console.log(`Synced ${fixture}`);
console.log(`     → ${target}`);
