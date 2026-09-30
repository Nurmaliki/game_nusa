import { BALANCE } from '../config/balance';
import { browser } from '$app/environment';

/**
 * Autosave scheduler (see §28). Fires on an interval and on safe lifecycle
 * events (visibilitychange/pagehide). Never fires per-frame.
 * Returns a disposer that stops the timer and removes listeners.
 */
export function startAutosave(save: () => void): { stop: () => void } {
	if (!browser) return { stop: () => {} };

	const interval = window.setInterval(save, BALANCE.save.autosaveIntervalMs);

	const onHidden = () => {
		// Best-effort save when the tab is backgrounded/hidden.
		if (document.visibilityState === 'hidden') save();
	};
	const onPageHide = () => save();

	document.addEventListener('visibilitychange', onHidden);
	window.addEventListener('pagehide', onPageHide);

	return {
		stop() {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', onHidden);
			window.removeEventListener('pagehide', onPageHide);
		}
	};
}
