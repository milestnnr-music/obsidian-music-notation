import { Notice, Plugin } from 'obsidian';
import {
	PHASE_45_PROBE_SCHEMA_VERSION,
	writeStartupProbeMarker,
} from './dev/phase-45-probe';
import { registerAbcCodeBlockProcessor } from './plugin/code-block';
import {
	DEFAULT_SETTINGS,
	type AbcBlocksSettings,
} from './settings/types';

export default class AbcBlocksPlugin extends Plugin {
	settings!: AbcBlocksSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		registerAbcCodeBlockProcessor(this);
		await writeStartupProbeMarker(this);
		new Notice(`ABC Blocks v${this.manifest.version} loaded`, 4000);
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AbcBlocksSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
