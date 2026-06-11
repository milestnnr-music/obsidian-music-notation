/**
 * Poll vault probe file after Obsidian LP load, then compare to expected.
 * Run: npm run wait:phase-4.5-probe
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const home = process.env.HOME ?? '';
const vault =
	process.env.ABC_BLOCKS_DEV_VAULT ??
	join(home, 'Desktop/Ideas/Obsidian Dev Vault');
const repoRoot = resolve(__dirname, '..');
const probeFile = join(repoRoot, 'test-results', 'phase-45-probe.json');
const timeoutMs = Number(process.env.ABC_BLOCKS_PROBE_TIMEOUT_MS ?? 120_000);
const intervalMs = 2_000;

const start = Date.now();
while (!existsSync(probeFile)) {
	if (Date.now() - start > timeoutMs) {
		console.error(`Timed out waiting for probe: ${probeFile}`);
		process.exit(1);
	}
	await new Promise((r) => setTimeout(r, intervalMs));
}

const result = spawnSync(
	'node',
	['scripts/compare-phase-45-probe.mjs'],
	{
		cwd: repoRoot,
		stdio: 'inherit',
		env: { ...process.env, ABC_BLOCKS_PROBE_FILE: probeFile },
	},
);
process.exit(result.status ?? 1);
