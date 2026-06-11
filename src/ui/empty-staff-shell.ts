import { getImplicitDefaultAbcShell } from '../serializer/abc-defaults';
import { renderAbcToElementWhenReady } from '../renderer/abcjs-adapter';
import { mountFallbackUi } from './fallback';

const EMPTY_SHELL_FALLBACK_MESSAGE = "Couldn't render the default staff.";

/** Phase 2.3: Render an empty treble staff using implicit defaults (4/4, C, quarter). */
export function mountEmptyStaffShell(container: HTMLElement): void {
	container.empty();
	const abc = getImplicitDefaultAbcShell();

	void renderAbcToElementWhenReady(container, abc).then((result) => {
		if (result.ok) {
			container.setAttribute('data-abc-rendered', 'true');
			container.setAttribute('data-abc-empty-shell', 'true');
			container.removeAttribute('data-abc-render-error');
			return;
		}

		mountFallbackUi(container, abc, EMPTY_SHELL_FALLBACK_MESSAGE);
		container.removeAttribute('data-abc-rendered');
		container.removeAttribute('data-abc-empty-shell');
		container.setAttribute('data-abc-render-error', result.error);
	});
}
