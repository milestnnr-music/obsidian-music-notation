/**
 * Phase 5: Live Preview root widget for ```abc blocks.
 * Phase 1.3 mounts this inside the interactive shell; Phase 2.1 renders ABC via abcjs.
 */
import { isEmptyAbcBlockSource } from '../plugin/block-source';
import { mountAbcOrFallback } from '../ui/fallback';
import { mountEmptyStaffShell } from '../ui/empty-staff-shell';

export function mountEditorWidget(
	container: HTMLElement,
	source = '',
	isEmpty = isEmptyAbcBlockSource(source),
): void {
	container.empty();

	if (isEmpty) {
		mountEmptyStaffShell(container);
		return;
	}

	mountAbcOrFallback(container, source);
}
