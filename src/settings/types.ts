/**
 * Vault-wide plugin settings persisted via `Plugin.loadData` / `saveData`.
 *
 * v1.0.0 has no settings tab — values stay at {@link DEFAULT_SETTINGS} unless
 * manually edited in the data file. Phase 7.4 adds a settings tab that reads/writes
 * these fields and calls {@link resolveBlockDefaults} from `./defaults`.
 */
export interface AbcBlocksSettings {
	/**
	 * Default ABC `K:` header for **new empty blocks** when the fence body is blank.
	 * Phase 7: consumed by `resolveBlockDefaults` → `createEmptyScore` /
	 * `getImplicitDefaultAbcShell` instead of hard-coded `ABC_DEFAULTS.keySignature`.
	 */
	defaultKeySignature: string;

	/**
	 * Default ABC `M:` header for **new empty blocks** when the fence body is blank.
	 * Phase 7: consumed by `resolveBlockDefaults` → `createEmptyScore` /
	 * `getImplicitDefaultAbcShell` instead of hard-coded `ABC_DEFAULTS.timeSignature`.
	 */
	defaultTimeSignature: string;

	/**
	 * Soft measure-count threshold for the informational “Examples work best at N
	 * measures or fewer” banner in Live Preview.
	 * Phase 7: consumed by `resolveBlockDefaults` → `getMeasureWarning` instead of
	 * hard-coded `ABC_DEFAULTS.measureWarningThreshold`.
	 */
	measureWarningThreshold: number;
}

/** Persisted defaults when no vault data exists or a field is missing. */
export const DEFAULT_SETTINGS: AbcBlocksSettings = {
	defaultKeySignature: 'C',
	defaultTimeSignature: '4/4',
	measureWarningThreshold: 4,
};
