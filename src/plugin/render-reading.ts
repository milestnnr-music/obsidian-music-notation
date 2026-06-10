/**
 * Phase 1.2: Reading view — static rendered shell (abcjs SVG in Phase 2).
 * No toolbar, no click-to-edit.
 */
export function renderReadingView(root: HTMLElement, source: string): void {
	const container = root.createDiv({
		cls: ['abc-blocks-reading', 'abc-blocks-static'],
	});

	container.createDiv({
		cls: 'abc-blocks-view-badge',
		text: 'Reading view',
	});

	container.createDiv({
		cls: 'abc-blocks-static-label',
		text: 'Static notation (placeholder until Phase 2)',
	});

	const trimmed = source.trim();
	if (trimmed) {
		const pre = container.createEl('pre', { cls: 'abc-blocks-reading-source' });
		pre.createEl('code', { text: trimmed });
	} else {
		container.createDiv({
			cls: 'abc-blocks-reading-empty',
			text: 'Empty ABC block',
		});
	}
}
