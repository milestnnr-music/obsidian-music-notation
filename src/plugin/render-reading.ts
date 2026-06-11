import { getAbcBlockContentState } from './block-source';
import { mountAbcOrFallback } from '../ui/fallback';
import { mountEmptyStaffShell } from '../ui/empty-staff-shell';

/**
 * Phase 1.2 / 2.4 / 2.3 / 5.8: Reading view — static abcjs SVG only (no toolbar, badge, or interaction).
 */
export function renderReadingView(root: HTMLElement, source: string): void {
	const contentState = getAbcBlockContentState(source);
	const isEmpty = contentState === 'empty';

	const container = root.createDiv({
		cls: ['abc-blocks-reading', 'abc-blocks-static'],
		attr: { 'data-abc-content': contentState },
	});

	if (isEmpty) {
		container.addClass('abc-blocks-empty');
	}

	if (isEmpty) {
		const mount = container.createDiv({ cls: 'abc-blocks-reading-mount' });
		mountEmptyStaffShell(mount);
		return;
	}

	const mount = container.createDiv({ cls: 'abc-blocks-reading-mount' });
	mountAbcOrFallback(mount, source);
}
