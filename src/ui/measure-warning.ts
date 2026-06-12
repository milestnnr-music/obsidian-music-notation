import { measureWarningMessage } from '../editor/error-copy';
import type { Score } from '../model/types';
import { ABC_DEFAULTS } from '../serializer/abc-defaults';

/** Measure count for the primary staff (v1 treble only). */
export function getScoreMeasureCount(score: Score): number {
	return score.staves[0]?.measures.length ?? 0;
}

/** Phase 5: Soft warning when a score exceeds the measure threshold. */
export function getMeasureWarning(
	measureCount: number,
	threshold = ABC_DEFAULTS.measureWarningThreshold,
): string | null {
	if (measureCount <= threshold) {
		return null;
	}
	return measureWarningMessage(threshold);
}
