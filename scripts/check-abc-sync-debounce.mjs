/**
 * Phase 4.2 tests: debounced ABC sync scheduler.
 * Run: npm run test:abc-sync-debounce
 */
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const { AbcSyncScheduler, ABC_SYNC_DEBOUNCE_MS } = await jiti.import(
	'../src/editor/sync.ts',
);

let passed = 0;
let failed = 0;

/** Record a pass or fail for one debounce check without stopping the rest of the script. */
function assert(condition, message) {
	if (!condition) {
		console.error(`FAIL: ${message}`);
		failed++;
		return;
	}
	console.log(`OK: ${message}`);
	passed++;
}

/** A clock the test moves by hand, so debounce timing does not depend on real setTimeout. */
function createFakeTimer(deps = {}) {
	const delayMs = deps.delayMs ?? ABC_SYNC_DEBOUNCE_MS;
	const timers = new Map();
	let nextId = 1;
	let now = 0;

	return {
		delayMs,
		/** Current fake time in milliseconds, so a test can see how far the clock has moved. */
		now: () => now,
		/** Move the fake clock forward and run any callbacks that are now due. */
		advance(ms) {
			now += ms;
			const due = [...timers.entries()]
				.filter(([, entry]) => entry.at <= now)
				.sort((a, b) => a[1].at - b[1].at);
			for (const [id, entry] of due) {
				timers.delete(id);
				entry.fn();
			}
		},
		scheduler: new AbcSyncScheduler({
			delayMs,
			/** Record a callback to run when the fake clock reaches this delay. */
			setTimer: (fn, ms) => {
				const id = nextId++;
				timers.set(id, { at: now + ms, fn });
				return id;
			},
			/** Drop a scheduled callback when the scheduler is cancelled or rescheduled. */
			clearTimer: (id) => {
				timers.delete(id);
			},
		}),
	};
}

const single = createFakeTimer();
let singleRuns = 0;
single.scheduler.schedule(() => {
	singleRuns++;
});
assert(single.scheduler.hasPending(), 'callback is pending before delay');
single.advance(ABC_SYNC_DEBOUNCE_MS - 1);
assert(singleRuns === 0, 'does not run before debounce elapses');
single.advance(1);
assert(singleRuns === 1, 'runs once after debounce');
assert(!single.scheduler.hasPending(), 'pending cleared after run');

const coalesced = createFakeTimer();
let coalescedRuns = 0;
let coalescedValue = 0;
coalesced.scheduler.schedule(() => {
	coalescedRuns++;
	coalescedValue = 1;
});
coalesced.scheduler.schedule(() => {
	coalescedRuns++;
	coalescedValue = 2;
});
coalesced.advance(100);
coalesced.scheduler.schedule(() => {
	coalescedRuns++;
	coalescedValue = 3;
});
coalesced.advance(ABC_SYNC_DEBOUNCE_MS);
assert(coalescedRuns === 1, 'rapid schedules coalesce to one run');
assert(coalescedValue === 3, 'last scheduled callback wins');

const cancelled = createFakeTimer();
let cancelledRuns = 0;
cancelled.scheduler.schedule(() => {
	cancelledRuns++;
});
cancelled.scheduler.cancel();
cancelled.advance(ABC_SYNC_DEBOUNCE_MS);
assert(cancelledRuns === 0, 'cancel prevents scheduled callback');

const flushed = createFakeTimer();
let flushedRuns = 0;
flushed.scheduler.schedule(() => {
	flushedRuns++;
});
flushed.scheduler.flush();
assert(flushedRuns === 1, 'flush runs pending callback immediately');
flushed.advance(ABC_SYNC_DEBOUNCE_MS);
assert(flushedRuns === 1, 'flush does not double-run after delay');

assert(ABC_SYNC_DEBOUNCE_MS === 300, 'debounce interval matches design');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
