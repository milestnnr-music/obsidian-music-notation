import { Plugin } from 'obsidian';
import { writeStartupProbeMarker } from './dev/phase-45-probe';
import { registerAbcCodeBlockProcessor } from './plugin/code-block';
import {
	DEFAULT_SETTINGS,
	type AbcBlocksSettings,
} from './settings';

/** Obsidian entry point: loads saved settings and starts rendering ```abc fences. */
export default class AbcBlocksPlugin extends Plugin {
	settings!: AbcBlocksSettings;

	/** Read settings, register the code-block processor, and write a startup probe marker. */
	async onload(): Promise<void> {
		// Phase 7.4: addPluginSettingsTab(new AbcBlocksSettingTab(this)) — see settings/index.ts
		await this.loadSettings();
		registerAbcCodeBlockProcessor(this);
		await writeStartupProbeMarker(this);
	}

	/** Called when the plugin is disabled; Obsidian tears the processors down itself. */
	onunload(): void {}

	/** Merge vault data over built-in defaults so a missing field still has a valid value. */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AbcBlocksSettings>,
		);
	}

	/** Write the current settings object into the vault plugin data file. */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
