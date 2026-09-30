/**
 * Pure, engine-agnostic device helpers (§44).
 *
 * Kept free of SvelteKit imports so they can be unit-tested in node.
 */

/** Hysteresis threshold (px) below which a viewport counts as "small". */
export const SMALL_SCREEN = 820;

/**
 * Whether to show the on-screen touch controls.
 * An explicit user setting (`override`) always wins; otherwise we fall back to
 * the detected touch capability.
 */
export function shouldShowTouchControls(override: boolean | null, isTouch: boolean): boolean {
	return override ?? isTouch;
}

/** Whether a viewport (smallest side in px) counts as a small screen. */
export function isSmallViewport(width: number, height: number): boolean {
	return Math.min(width, height) < SMALL_SCREEN;
}
