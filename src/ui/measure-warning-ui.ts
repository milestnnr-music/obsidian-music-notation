import { getMeasureWarning } from './measure-warning';

const DISMISSED_COUNT_ATTR = 'data-abc-measure-warning-dismissed-at';

/** Show or hide the measure-count banner, remembering a dismiss until the count changes. */
export function mountMeasureWarning(container: HTMLElement, measureCount: number): void {
	const message = getMeasureWarning(measureCount);
	const dismissedAt = container.getAttribute(DISMISSED_COUNT_ATTR);
	const existing = container.querySelector<HTMLElement>('.abc-blocks-measure-warning');

	if (!message) {
		container.removeAttribute(DISMISSED_COUNT_ATTR);
		existing?.remove();
		return;
	}

	if (dismissedAt === String(measureCount)) {
		existing?.remove();
		return;
	}

	container.removeAttribute(DISMISSED_COUNT_ATTR);

	let banner = existing;
	if (!banner) {
		banner = container.createDiv({ cls: 'abc-blocks-measure-warning' });
		banner.createSpan({ cls: 'abc-blocks-measure-warning-text' });

		const dismiss = banner.createEl('button', {
			cls: 'abc-blocks-measure-warning-dismiss',
			attr: { type: 'button', 'aria-label': 'Dismiss' },
			text: '×',
		});
		dismiss.addEventListener('click', (event) => {
			event.stopPropagation();
			const count = container.getAttribute('data-abc-measure-warning-count');
			if (count) {
				container.setAttribute(DISMISSED_COUNT_ATTR, count);
			}
			banner?.remove();
		});
	}

	container.setAttribute('data-abc-measure-warning-count', String(measureCount));

	const textEl = banner.querySelector('.abc-blocks-measure-warning-text');
	if (textEl) {
		textEl.textContent = message;
	}
}
