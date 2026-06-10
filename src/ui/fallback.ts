import { renderAbcToElementWhenReady } from '../renderer/abcjs-adapter';

/** User-facing copy when abcjs cannot parse or render the fence body. */
export const ABC_FALLBACK_MESSAGE = "Couldn't render this ABC.";

/** Phase 2.2: Graceful fallback when ABC cannot be parsed or rendered. */
export function mountFallbackUi(
	container: HTMLElement,
	abc: string,
	message = ABC_FALLBACK_MESSAGE,
): void {
	container.empty();

	const wrap = container.createDiv({ cls: 'abc-blocks-fallback' });
	wrap.createEl('p', { cls: 'abc-blocks-fallback-message', text: message });
	wrap.createEl('pre', { cls: 'abc-blocks-fallback-source', text: abc.trim() });
}

/** Render ABC via abcjs, or show fallback UI on failure. */
export function mountAbcOrFallback(container: HTMLElement, source: string): void {
	void renderAbcToElementWhenReady(container, source).then((result) => {
		if (result.ok) {
			container.setAttribute('data-abc-rendered', 'true');
			container.removeAttribute('data-abc-render-error');
			return;
		}

		mountFallbackUi(container, source);
		container.removeAttribute('data-abc-rendered');
		container.setAttribute('data-abc-render-error', result.error);
	});
}
