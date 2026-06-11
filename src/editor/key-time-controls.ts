import type { Score } from '../model/types';
import type { AbcBlockSyncContext, AbcSyncScheduler } from './sync';
import { scheduleScoreToAbcBlock } from './sync';
import { setKeySignature, setTimeSignature } from './score-header-mutations';

export interface KeyTimeControlsDeps {
	readonly getScore: () => Score;
	readonly onScoreChange: (score: Score) => void;
	readonly getSyncContext: () => Promise<AbcBlockSyncContext>;
	readonly scheduler: AbcSyncScheduler;
}

/** v1 treble teaching keys — ABC `K:` values. */
export const KEY_SIGNATURE_OPTIONS: readonly string[] = [
	'C',
	'G',
	'F',
	'D',
	'Bb',
];

/** v1 time signatures — ABC `M:` values. */
export const TIME_SIGNATURE_OPTIONS: readonly string[] = ['4/4', '3/4', '2/4'];

/** Phase 5.6: Key and time signature pickers for the current block. */
export function mountKeyTimeControls(
	container: HTMLElement,
	deps: KeyTimeControlsDeps,
): void {
	const keyGroup = container.createDiv({
		cls: 'abc-blocks-toolbar-group',
		attr: { role: 'group', 'aria-label': 'Key signature' },
	});
	keyGroup.createSpan({
		cls: 'abc-blocks-toolbar-label',
		text: 'Key',
	});

	const keySelect = keyGroup.createEl('select', {
		cls: 'abc-blocks-toolbar-select',
		attr: { title: 'Key signature', 'aria-label': 'Key signature' },
	});
	for (const key of KEY_SIGNATURE_OPTIONS) {
		keySelect.createEl('option', { text: key, attr: { value: key } });
	}

	const timeGroup = container.createDiv({
		cls: 'abc-blocks-toolbar-group',
		attr: { role: 'group', 'aria-label': 'Time signature' },
	});
	timeGroup.createSpan({
		cls: 'abc-blocks-toolbar-label',
		text: 'Time',
	});

	const timeSelect = timeGroup.createEl('select', {
		cls: 'abc-blocks-toolbar-select',
		attr: { title: 'Time signature', 'aria-label': 'Time signature' },
	});
	for (const time of TIME_SIGNATURE_OPTIONS) {
		timeSelect.createEl('option', { text: time, attr: { value: time } });
	}

	const syncFromScore = (): void => {
		const score = deps.getScore();
		keySelect.value = normalizeSelectValue(
			score.keySignature,
			KEY_SIGNATURE_OPTIONS,
			KEY_SIGNATURE_OPTIONS[0] ?? 'C',
		);
		timeSelect.value = normalizeSelectValue(
			score.timeSignature,
			TIME_SIGNATURE_OPTIONS,
			TIME_SIGNATURE_OPTIONS[0] ?? '4/4',
		);
	};

	const commitHeaderChange = (updated: Score): void => {
		if (updated === deps.getScore()) {
			return;
		}
		deps.onScoreChange(updated);
		void deps.getSyncContext().then((ctx) => {
			if (ctx.blockIndex === null) {
				return;
			}
			scheduleScoreToAbcBlock(deps.scheduler, ctx, updated);
		});
	};

	const onKeyChange = (): void => {
		const updated = setKeySignature(deps.getScore(), keySelect.value);
		commitHeaderChange(updated);
	};

	const onTimeChange = (): void => {
		const updated = setTimeSignature(deps.getScore(), timeSelect.value);
		commitHeaderChange(updated);
	};

	keySelect.addEventListener('change', (event) => {
		event.stopPropagation();
		onKeyChange();
	});
	timeSelect.addEventListener('change', (event) => {
		event.stopPropagation();
		onTimeChange();
	});

	syncFromScore();
}

function normalizeSelectValue(
	value: string,
	options: readonly string[],
	fallback: string,
): string {
	if (options.includes(value)) {
		return value;
	}
	return fallback;
}
