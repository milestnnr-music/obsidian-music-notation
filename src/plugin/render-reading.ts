import { getAbcBlockContentState } from './block-source';

/**
 * Phase 1.2: Reading view — static rendered shell (abcjs SVG in Phase 2).
 * No toolbar, no click-to-edit.
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

	container.createDiv({
		cls: 'abc-blocks-static-label',
		text: isEmpty
			? 'Empty block (staff shell in Phase 2)'
			: 'Static notation (placeholder until Phase 2)',
	});

	if (isEmpty) {
		container.createDiv({
			cls: 'abc-blocks-empty-message',
			text: 'No ABC in this block yet',
		});
		return;
	}

	const pre = container.createEl('pre', { cls: 'abc-blocks-reading-source' });
	pre.createEl('code', { text: source.trim() });
}
