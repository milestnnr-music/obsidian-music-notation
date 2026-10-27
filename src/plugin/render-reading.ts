import { getAbcBlockContentState } from './block-source';
import { mountAbcOrFallback } from '../ui/fallback';
import { mountEmptyStaffShell } from '../ui/empty-staff-shell';

/** Draw a static staff in Reading view: an empty shell for blank fences, otherwise the ABC or a fallback message. */
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
