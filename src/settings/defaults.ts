import { ABC_DEFAULTS } from '../serializer/abc-defaults';
import {
	DEFAULT_SETTINGS,
	type AbcBlocksSettings,
} from './types';

/** v1 teaching keys — keep in sync with `editor/key-time-controls.ts`. */
const ALLOWED_KEY_SIGNATURES: readonly string[] = ['C', 'G', 'F', 'D', 'Bb'];

/** v1 time signatures — keep in sync with `editor/key-time-controls.ts`. */
const ALLOWED_TIME_SIGNATURES: readonly string[] = ['4/4', '3/4', '2/4'];

/**
 * Resolved per-block defaults derived from vault settings.
 * Phase 7 uses this shape when creating empty scores and evaluating measure warnings.
 */
export interface BlockDefaults {
	/** ABC `K:` value for new empty blocks. */
	key: string;
	/** ABC `M:` value for new empty blocks. */
	time: string;
	/** Soft measure-count threshold for informational warning banners. */
	measureThreshold: number;
}

/** Keep a saved key only if it is one of the v1 teaching keys; otherwise use C. */
function normalizeKey(value: string | undefined): string {
	if (value && ALLOWED_KEY_SIGNATURES.includes(value)) {
		return value;
	}
	return ABC_DEFAULTS.keySignature;
}

/** Keep a saved time signature only if it is 4/4, 3/4, or 2/4; otherwise use 4/4. */
function normalizeTime(value: string | undefined): string {
	if (value && ALLOWED_TIME_SIGNATURES.includes(value)) {
		return value;
	}
	return ABC_DEFAULTS.timeSignature;
}

/** Keep a positive whole-number measure warning threshold, or the built-in default of 4. */
function normalizeMeasureThreshold(value: number | undefined): number {
	if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
		return Math.floor(value);
	}
	return ABC_DEFAULTS.measureWarningThreshold;
}

/**
 * Map persisted vault settings to concrete defaults for empty-block creation and
 * measure-warning evaluation.
 *
 * **Phase 7 consumption (not wired in v1.0.0):**
 * - **Empty block shell:** pass `key` / `time` into `createEmptyScore` and
 *   `getImplicitDefaultAbcShell` when a fence has no ABC body yet.
 * - **Measure warning:** pass `measureThreshold` into `getMeasureWarning(count, threshold)`
 *   from `editor-widget` after staff edits or ABC re-parse.
 *
 * v1.0.0 continues to use `ABC_DEFAULTS` directly; this function exists so Phase 7.4
 * can thread `plugin.settings` through without changing the settings schema again.
 */
export function resolveBlockDefaults(
	settings: AbcBlocksSettings = DEFAULT_SETTINGS,
): BlockDefaults {
	return {
		key: normalizeKey(settings.defaultKeySignature),
		time: normalizeTime(settings.defaultTimeSignature),
		measureThreshold: normalizeMeasureThreshold(
			settings.measureWarningThreshold,
		),
	};
}
