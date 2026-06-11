import type { NoteDuration } from '../model/types';
import { defaultDurationToAbcL } from './abc-mapping';

export const ABC_DEFAULTS = {
	timeSignature: '4/4',
	keySignature: 'C',
	defaultNoteDuration: 'quarter' satisfies NoteDuration,
	measureWarningThreshold: 4,
} as const;

/**
 * In-memory ABC for empty fence bodies (Phase 2.3).
 * Not written to markdown until the first edit (Phase 4.3).
 * One empty measure renders a treble staff shell via abcjs.
 */
export function getImplicitDefaultAbcShell(): string {
	const { timeSignature, keySignature, defaultNoteDuration } = ABC_DEFAULTS;
	return [
		'X:1',
		`M:${timeSignature}`,
		`L:${defaultDurationToAbcL(defaultNoteDuration)}`,
		`K:${keySignature}`,
		'|',
	].join('\n');
}
