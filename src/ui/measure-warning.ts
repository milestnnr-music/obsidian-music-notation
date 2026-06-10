import { ABC_DEFAULTS } from '../serializer/abc-defaults';

/** Phase 5: Soft warning when a score exceeds the measure threshold. */
export function getMeasureWarning(
	measureCount: number,
	threshold = ABC_DEFAULTS.measureWarningThreshold,
): string | null {
	if (measureCount <= threshold) {
		return null;
	}
	return `Examples work best at ${threshold} measures or fewer.`;
}
