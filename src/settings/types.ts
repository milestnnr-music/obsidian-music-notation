/**
 * Vault-wide settings. v1 has no settings tab; defaults are per-block via ABC.
 * Phase 7: add settings tab using these types.
 */
export interface AbcBlocksSettings {
	/** Reserved for Phase 7 — default key for new empty blocks. */
	defaultKeySignature: string;
	/** Reserved for Phase 7 — default time for new empty blocks. */
	defaultTimeSignature: string;
	/** Reserved for Phase 7 — soft measure warning threshold. */
	measureWarningThreshold: number;
}

export const DEFAULT_SETTINGS: AbcBlocksSettings = {
	defaultKeySignature: 'C',
	defaultTimeSignature: '4/4',
	measureWarningThreshold: 4,
};
