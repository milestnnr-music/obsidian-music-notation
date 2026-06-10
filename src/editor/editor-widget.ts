/**
 * Phase 5: Live Preview root widget for ```abc blocks.
 * Phase 1.3 mounts this stub inside the interactive shell.
 */
import { isEmptyAbcBlockSource } from '../plugin/block-source';

export function mountEditorWidget(
	container: HTMLElement,
	source = '',
	isEmpty = isEmptyAbcBlockSource(source),
): void {
	const stub = container.createDiv({
		cls: 'abc-blocks-editor-widget-stub',
		attr: isEmpty ? { 'data-abc-empty': 'true' } : undefined,
	});

	if (isEmpty) {
		stub.createSpan({ text: 'Empty block — editor widget placeholder' });
		return;
	}

	stub.createSpan({ text: 'Editor widget placeholder' });
	stub.setAttribute('data-abc-lines', String(source.trim().split('\n').length));
}
