import { getAbcBlockContentState } from './block-source';
import { mountAbcOrFallback } from '../ui/fallback';

/**
 * Phase 1.2 / 2.4: Reading view — static abcjs SVG (no toolbar, no click-to-edit).
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

	container.createDiv({
		cls: 'abc-blocks-view-badge',
		text: 'Reading view',
	});

	if (isEmpty) {
		container.createDiv({
			cls: 'abc-blocks-empty-message',
			text: 'No ABC in this block yet',
		});
		return;
	}

	const mount = container.createDiv({ cls: 'abc-blocks-reading-mount' });
	mountAbcOrFallback(mount, source);
}
