/** Phase 2: Graceful fallback when ABC cannot be parsed or rendered. */
export function mountFallbackUi(
	container: HTMLElement,
	abc: string,
	message = "Couldn't render this notation — fix the ABC below.",
): void {
	container.empty();
	container.createEl('p', { text: message });
	container.createEl('pre', { text: abc });
}
