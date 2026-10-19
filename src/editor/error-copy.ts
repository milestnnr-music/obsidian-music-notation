/** User-facing fallback when abcjs cannot parse or render fence ABC. */
export const ABC_FALLBACK_MESSAGE = "Couldn't render this ABC.";

/** Fallback when the implicit default empty staff fails to render. */
export const EMPTY_STAFF_FALLBACK_MESSAGE = "Couldn't render the default staff.";

/** Shown briefly while the empty staff shell loads. */
export const EMPTY_STAFF_LOADING_MESSAGE = 'Loading staff…';

/** Informational banner when a score exceeds the measure threshold. */
export function measureWarningMessage(threshold: number): string {
	return `Examples work best at ${threshold} measures or fewer.`;
}

/** User-facing sync failure reasons (returned from sync helpers). */
export const SYNC_FAILURE_NOTE_NOT_FOUND = "Couldn't find the note file.";
export const SYNC_FAILURE_BLOCK_NOT_FOUND =
	"Couldn't find this ABC block in the note.";

/**
 * Short friendly text for render failures stored on `data-abc-render-error`.
 * Never forwards raw exception text or stack traces.
 */
export function friendlyAbcRenderError(_technical?: string): string {
	return ABC_FALLBACK_MESSAGE;
}
