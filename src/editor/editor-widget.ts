/**
 * Phase 5: Live Preview root widget for ```abc blocks.
 * Phase 1.3 mounts this stub inside the interactive shell.
 */
export function mountEditorWidget(container: HTMLElement, source = ''): void {
	const stub = container.createDiv({ cls: 'abc-blocks-editor-widget-stub' });
	stub.createSpan({ text: 'Editor widget placeholder' });

	const trimmed = source.trim();
	if (trimmed) {
		stub.setAttribute('data-abc-lines', String(trimmed.split('\n').length));
	}
}
