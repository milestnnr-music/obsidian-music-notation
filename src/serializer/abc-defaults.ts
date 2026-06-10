import type { NoteDuration } from '../model/types';

export const ABC_DEFAULTS = {
	timeSignature: '4/4',
	keySignature: 'C',
	defaultNoteDuration: 'quarter' satisfies NoteDuration,
	measureWarningThreshold: 4,
} as const;
