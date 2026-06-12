import {
	EMPTY_STAFF_FALLBACK_MESSAGE,
	EMPTY_STAFF_LOADING_MESSAGE,
	friendlyAbcRenderError,
} from '../editor/error-copy';
import { getImplicitDefaultAbcShell } from '../serializer/abc-defaults';
import { renderAbcToElementWhenReady } from '../renderer/abcjs-adapter';
import { mountFallbackUi } from './fallback';

/** Phase 2.3: Render an empty treble staff using implicit defaults (4/4, C, quarter). */
export function mountEmptyStaffShell(container: HTMLElement): void {
	container.empty();
	container.createDiv({
		cls: 'abc-blocks-empty-staff-loading',
		text: EMPTY_STAFF_LOADING_MESSAGE,
	});
	const abc = getImplicitDefaultAbcShell();

	void renderAbcToElementWhenReady(container, abc).then((result) => {
		if (result.ok) {
			container.querySelector('.abc-blocks-empty-staff-loading')?.remove();
			container.setAttribute('data-abc-rendered', 'true');
			container.setAttribute('data-abc-empty-shell', 'true');
			container.removeAttribute('data-abc-render-error');
			return;
		}

		mountFallbackUi(container, abc, EMPTY_STAFF_FALLBACK_MESSAGE);
		container.removeAttribute('data-abc-rendered');
		container.removeAttribute('data-abc-empty-shell');
		container.setAttribute('data-abc-render-error', friendlyAbcRenderError(result.error));
	});
}
