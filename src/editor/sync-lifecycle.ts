import type { AbcSyncScheduler } from './sync';

/**
 * Phase 4.4: Flush pending debounced ABC sync before block teardown.
 * Runs any pending callback immediately and clears the timer so a late
 * debounced write cannot land after unmount and corrupt the Obsidian undo stack.
 */
export function flushAbcSyncScheduler(scheduler: AbcSyncScheduler): void {
	scheduler.flush();
}
