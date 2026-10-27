/**
 * Full Phase 4.5 automated cycle (Node layer).
 * Obsidian LP probe compare runs when probe file exists after reload.
 *
 * Run: npm run cycle:phase-4.5
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
const vault =
	process.env.ABC_BLOCKS_DEV_VAULT ??
	join(home, 'Desktop/Ideas/Obsidian Dev Vault');
const probeFile = join(repoRoot, 'test-results', 'phase-45-probe.json');

/** Run one step of the phase 4.5 cycle and stop the script if that step fails. */
function run(cmd, args, opts = {}) {
	const result = spawnSync(cmd, args, {
		cwd: repoRoot,
		stdio: 'inherit',
		shell: false,
		...opts,
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const steps = [
	['npm', ['run', 'build']],
	['npm', ['run', 'lint']],
	['npm', ['run', 'test:abc-block-patch']],
	['npm', ['run', 'test:abc-sync-debounce']],
	['npm', ['run', 'test:phase-4.5']],
	['node', ['scripts/sync-test-note-to-vault.mjs']],
	['node', ['scripts/verify-test-note.mjs']],
];

for (const [cmd, args] of steps) {
	console.log(`\n==> ${cmd} ${args.join(' ')}`);
	run(cmd, args, {
		env: { ...process.env, ABC_BLOCKS_DEV_VAULT: vault },
	});
}

if (existsSync(probeFile)) {
	console.log(`\n==> probe found, comparing ${probeFile}`);
	run('node', ['scripts/compare-phase-45-probe.mjs'], {
		env: { ...process.env, ABC_BLOCKS_PROBE_FILE: probeFile },
	});
} else if (process.env.ABC_BLOCKS_WAIT_PROBE === '1') {
	console.log(`\n==> waiting for probe at ${probeFile}`);
	run('node', ['scripts/wait-and-compare-probe.mjs'], {
		env: { ...process.env, ABC_BLOCKS_DEV_VAULT: vault },
	});
} else {
	console.log('\n-- Obsidian LP step --');
	console.log('1. Reload Obsidian dev vault without saving');
	console.log('2. Open Test.md in Live Preview');
	console.log(`3. Probe writes to: ${probeFile}`);
	console.log('4. npm run compare:phase-4.5-probe');
	console.log('   Or: ABC_BLOCKS_WAIT_PROBE=1 npm run cycle:phase-4.5');
}

console.log('\nCycle complete (Node layer).');
