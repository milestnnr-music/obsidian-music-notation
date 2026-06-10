/** Parsed content state for an ```abc fence body (Phase 1.5). */
export type AbcBlockContentState = 'empty' | 'has-content';

/**
 * True when the fence body is empty or whitespace-only (spaces, tabs, newlines).
 * Phase 2.3 adds the staff shell for empty blocks; Phase 4.3 writes ABC on first edit.
 */
export function isEmptyAbcBlockSource(source: string): boolean {
	return source.trim().length === 0;
}

export function getAbcBlockContentState(source: string): AbcBlockContentState {
	return isEmptyAbcBlockSource(source) ? 'empty' : 'has-content';
}
