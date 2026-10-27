import { MarkdownView, TFile, type App } from 'obsidian';
import { buildLpEmbedSnapshot } from '../plugin/lp-embed-snapshot';
import {
	abcHasMusicLines,
	isEmptyAbcBlockSource,
	readAbcBodyAtBlockIndex,
} from '../plugin/block-source';
import {
	ABC_BLOCK_INDEX_ATTR,
	ABC_OPEN_LINE_ATTR,
} from '../plugin/block-identity';

export const PHASE_45_PROBE_FILENAME = 'phase-45-probe.json';
/** Written via vault adapter into the plugin folder (symlink → repo test-results/). */
export const PHASE_45_PROBE_PLUGIN_PATH =
	// Dev probe path — intentionally under default config dir for symlinked plugin layout.
	// eslint-disable-next-line obsidianmd/hardcoded-config-path -- fixed probe output for dev vault symlink
	'.obsidian/plugins/abc-blocks/test-results/phase-45-probe.json';
/** Visible copy in vault root for manual inspection. */
export const PHASE_45_PROBE_VAULT_PATH = 'abc-blocks-probe/phase-45-probe.json';
/** Bump when probe shape or semantics change — compare script rejects older probes. */
export const PHASE_45_PROBE_SCHEMA_VERSION = 2;

const shellsByPath = new Map<string, Phase45ProbeShell[]>();

export interface Phase45ProbeShell {
	readonly blockIndex: number | null;
	readonly openLine: number | null;
	/** Index among ```abc embed hosts in the note view (visual position). */
	readonly domEmbedIndex: number | null;
	readonly resolvedSourcePreview: string;
	readonly isEmpty: boolean;
	readonly hasMusic: boolean;
	readonly hasEmptyStaffShell: boolean;
	readonly event: string;
}

export interface Phase45ProbeSnapshot {
	readonly probeSchemaVersion: number;
	readonly pluginVersion: string;
	readonly path: string;
	readonly timestamp: string;
	readonly fence0BodyPreview: string;
	readonly fence1BodyPreview: string;
	readonly shells: Phase45ProbeShell[];
}

/** Dev / test: structured LP state for automated diff. */
export function buildPhase45ProbeShell(
	shellRoot: HTMLElement,
	mountContainer: HTMLElement,
	resolvedSource: string,
	event: string,
	app: App,
	sourcePath: string,
	processorEl: HTMLElement,
): Phase45ProbeShell {
	const blockIndexRaw = shellRoot.getAttribute(ABC_BLOCK_INDEX_ATTR);
	const openLineRaw = shellRoot.getAttribute(ABC_OPEN_LINE_ATTR);
	const blockIndex =
		blockIndexRaw !== null && blockIndexRaw !== '' ? Number(blockIndexRaw) : null;
	const openLine =
		openLineRaw !== null && openLineRaw !== '' ? Number(openLineRaw) : null;
	const isEmpty = isEmptyAbcBlockSource(resolvedSource);
	const domEmbedIndex =
		buildLpEmbedSnapshot(app, processorEl, sourcePath)?.domEmbedIndex ?? null;

	return {
		blockIndex: Number.isFinite(blockIndex) ? blockIndex : null,
		openLine: Number.isFinite(openLine) ? openLine : null,
		domEmbedIndex,
		resolvedSourcePreview: resolvedSource.slice(0, 80),
		isEmpty,
		hasMusic: abcHasMusicLines(resolvedSource),
		hasEmptyStaffShell:
			isEmpty && mountContainer.querySelector('[data-abc-empty-shell="true"]') !== null,
		event,
	};
}

/** Replace prior shell entry for the same block index on this note path. */
export function recordPhase45ProbeShell(
	sourcePath: string,
	shell: Phase45ProbeShell,
): void {
	const list = (shellsByPath.get(sourcePath) ?? []).filter(
		(entry) => entry.blockIndex !== shell.blockIndex,
	);
	list.push(shell);
	shellsByPath.set(sourcePath, list);
}

/** Assemble the probe JSON for one note: fence previews plus the latest shell records. */
export function buildPhase45ProbeSnapshot(
	sourcePath: string,
	markdown: string,
	pluginVersion: string,
): Phase45ProbeSnapshot {
	return {
		probeSchemaVersion: PHASE_45_PROBE_SCHEMA_VERSION,
		pluginVersion,
		path: sourcePath,
		timestamp: new Date().toISOString(),
		fence0BodyPreview: (readAbcBodyAtBlockIndex(markdown, 0) ?? '').slice(0, 80),
		fence1BodyPreview: (readAbcBodyAtBlockIndex(markdown, 1) ?? '').slice(0, 80),
		shells: [...(shellsByPath.get(sourcePath) ?? [])].sort(
			(a, b) => (a.blockIndex ?? 99) - (b.blockIndex ?? 99),
		),
	};
}

let flushTimer: number | null = null;
let lastMarkdownByPath = new Map<string, string>();

/** Cache the markdown a shell just read so the probe does not have to re-read the vault. */
export function noteMarkdownForProbe(sourcePath: string, markdown: string): void {
	lastMarkdownByPath.set(sourcePath, markdown);
}

/** Markdown for the probe: the cache, then an open editor, then the file on disk. */
async function readMarkdownForProbe(app: App, sourcePath: string): Promise<string> {
	const cached = lastMarkdownByPath.get(sourcePath);
	if (cached !== undefined && cached.length > 0) {
		return cached;
	}

	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === sourcePath) {
			const value = view.editor?.getValue() ?? view.data;
			lastMarkdownByPath.set(sourcePath, value);
			return value;
		}
	}

	const file = app.vault.getAbstractFileByPath(sourcePath);
	if (file instanceof TFile) {
		const fromDisk = await app.vault.cachedRead(file);
		lastMarkdownByPath.set(sourcePath, fromDisk);
		return fromDisk;
	}

	return '';
}

/** Create the folder that will hold the probe file when it does not exist yet. */
async function ensureParentDir(adapter: DataAdapter, filePath: string): Promise<void> {
	const parts = filePath.split('/');
	parts.pop();
	const dir = parts.join('/');
	if (!dir) {
		return;
	}
	try {
		if (typeof adapter.exists === 'function' && (await adapter.exists(dir))) {
			return;
		}
		await adapter.mkdir(dir);
	} catch {
		try {
			await adapter.mkdir(dir);
		} catch {
			// parent may already exist
		}
	}
}

type DataAdapter = App['vault']['adapter'];

/** Write the probe into the plugin folder and a visible vault copy; one success is enough. */
async function writeProbePayload(app: App, payload: string): Promise<void> {
	const adapter = app.vault.adapter;
	const targets = [PHASE_45_PROBE_PLUGIN_PATH, PHASE_45_PROBE_VAULT_PATH];
	let wrote = false;
	const errors: unknown[] = [];

	for (const target of targets) {
		try {
			await ensureParentDir(adapter, target);
			await adapter.write(target, payload);
			wrote = true;
		} catch (error) {
			errors.push(error);
			console.error(`[abc-blocks] probe write failed for ${target}`, error);
		}
	}

	if (!wrote) {
		const first = errors[0];
		if (first instanceof Error) {
			throw first;
		}
		throw new Error('probe write failed');
	}
}

/** Written on every plugin load so compare can detect stale Obsidian sessions. */
export async function writeStartupProbeMarker(plugin: {
	app: App;
	manifest: { version: string };
}): Promise<void> {
	const snapshot = buildPhase45ProbeSnapshot('', '', plugin.manifest.version);
	const payload = JSON.stringify(snapshot, null, 2);
	await writeProbePayload(plugin.app, payload);
}

/** Debounced write for agent diff (npm run compare:phase-4.5-probe). */
export function schedulePhase45ProbeFlush(
	app: App,
	sourcePath: string,
	pluginVersion: string,
): void {
	if (flushTimer !== null) {
		window.clearTimeout(flushTimer);
	}
	flushTimer = window.setTimeout(() => {
		flushTimer = null;
		void flushPhase45Probe(app, sourcePath, pluginVersion);
	}, 50);
}

/** Write the latest probe to disk and into a script tag the compare tool can read. */
export async function flushPhase45Probe(
	app: App,
	sourcePath: string,
	pluginVersion: string,
): Promise<void> {
	const markdown = await readMarkdownForProbe(app, sourcePath);
	const snapshot = buildPhase45ProbeSnapshot(sourcePath, markdown, pluginVersion);
	const payload = JSON.stringify(snapshot, null, 2);
	writePhase45ProbeToDocument(app.workspace.containerEl.ownerDocument, snapshot);
	await writeProbePayload(app, payload);
}

/** Put the probe JSON in a script tag so a headless check can read it from the document. */
export function writePhase45ProbeToDocument(
	document: Document,
	snapshot: Phase45ProbeSnapshot,
): void {
	if (!document.body) {
		return;
	}
	const payload = JSON.stringify(snapshot, null, 2);
	let el = document.getElementById('abc-blocks-phase-45-probe');
	if (!el) {
		const script = document.createElement('script');
		script.id = 'abc-blocks-phase-45-probe';
		script.setAttribute('type', 'application/json');
		document.body.appendChild(script);
		el = script;
	}
	el.textContent = payload;
}
