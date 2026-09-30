import { browser } from '$app/environment';
import { isSmallViewport, shouldShowTouchControls } from './device-helpers';

/**
 * Device capability store (§44).
 *
 * Detects coarse pointer / touch support and viewport orientation so the UI can
 * present on-screen controls on phones/tablets while keeping the keyboard HUD on
 * desktop. Pure capability detection — no gameplay logic.
 */

function detectTouch(): boolean {
	if (!browser) return false;
	if (navigator.maxTouchPoints > 0) return true;
	return window.matchMedia('(pointer: coarse)').matches;
}

function detectLandscape(): boolean {
	if (!browser) return true;
	return window.innerWidth >= window.innerHeight;
}

function detectStandalone(): boolean {
	if (!browser) return false;
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(navigator as unknown as { standalone?: boolean }).standalone === true
	);
}

function detectSmall(): boolean {
	if (!browser) return false;
	return isSmallViewport(window.innerWidth, window.innerHeight);
}

class DeviceStore {
	/** Coarse-pointer device (phone/tablet). */
	isTouch = $state(false);
	/** Viewport is wider than it is tall. */
	isLandscape = $state(true);
	/** Running as an installed PWA. */
	isStandalone = $state(false);
	/** Small viewport (phone-ish). */
	isSmall = $state(false);

	private started = false;

	/** Begin listening for viewport changes. Safe to call more than once. */
	init(): void {
		if (!browser || this.started) return;
		this.started = true;
		this.update();
		window.addEventListener('resize', this.onResize, { passive: true });
		window.addEventListener('orientationchange', this.onResize, { passive: true });
	}

	private onResize = (): void => this.update();

	private update(): void {
		this.isTouch = detectTouch();
		this.isLandscape = detectLandscape();
		this.isStandalone = detectStandalone();
		this.isSmall = detectSmall();
	}

	destroy(): void {
		if (!browser || !this.started) return;
		this.started = false;
		window.removeEventListener('resize', this.onResize);
		window.removeEventListener('orientationchange', this.onResize);
	}
}

export const deviceStore = new DeviceStore();

export { shouldShowTouchControls };
