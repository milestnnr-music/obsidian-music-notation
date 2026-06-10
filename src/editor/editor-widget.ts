/**
 * Phase 5: Live Preview root widget for ```abc blocks.
 * Phase 1.3 mounts this inside the interactive shell; Phase 2.1 renders ABC via abcjs.
 */
import {
	abcHasMusicLines,
	isEmptyAbcBlockSource,
	normalizeAbcBlockBody,
} from '../plugin/block-source';
import { renderAbcToElementWhenReady } from '../renderer/abcjs-adapter';

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

	void renderAbcToElementWhenReady(container, source).then((result) => {
		if (result.ok) {
			container.setAttribute('data-abc-rendered', 'true');
			container.removeAttribute('data-abc-render-error');
			return;
		}

		container.empty();
		const stub = container.createDiv({ cls: 'abc-blocks-editor-widget-stub' });
		stub.createSpan({ text: 'Editor widget placeholder' });
		const normalized = normalizeAbcBlockBody(source);
		stub.setAttribute('data-abc-lines', String(normalized.split('\n').length));
		stub.setAttribute('data-abc-has-music', String(abcHasMusicLines(normalized)));
		stub.setAttribute(
			'data-abc-last-line',
			normalized.split('\n').at(-1) ?? '',
		);
		stub.setAttribute('data-abc-render-error', result.error);
		container.removeAttribute('data-abc-rendered');
	});
}
