/**
 * Phase 5: Live Preview root widget for ```abc blocks.
 * Phase 1.3 mounts this inside the interactive shell; Phase 2.1 renders ABC via abcjs.
 */
import { isEmptyAbcBlockSource } from '../plugin/block-source';
import { mountAbcOrFallback } from '../ui/fallback';

export function mountEditorWidget(
	container: HTMLElement,
	source = '',
	isEmpty = isEmptyAbcBlockSource(source),
): void {
	if (isEmpty) {
		const stub = container.createDiv({
			cls: 'abc-blocks-editor-widget-stub',
			attr: { 'data-abc-empty': 'true' },
		});
		stub.createSpan({ text: 'Empty block — editor widget placeholder' });
		return;
	}

	mountAbcOrFallback(container, source);
}
