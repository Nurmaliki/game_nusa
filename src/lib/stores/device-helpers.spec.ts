import { describe, it, expect } from 'vitest';
import { shouldShowTouchControls, isSmallViewport, SMALL_SCREEN } from './device-helpers';

describe('shouldShowTouchControls', () => {
	it('respects an explicit "on" override on desktop', () => {
		expect(shouldShowTouchControls(true, false)).toBe(true);
	});

	it('respects an explicit "off" override on touch devices', () => {
		expect(shouldShowTouchControls(false, true)).toBe(false);
	});

	it('auto-shows on touch devices when no override', () => {
		expect(shouldShowTouchControls(null, true)).toBe(true);
	});

	it('auto-hides on non-touch devices when no override', () => {
		expect(shouldShowTouchControls(null, false)).toBe(false);
	});
});

describe('isSmallViewport', () => {
	it('treats phone-sized viewports as small', () => {
		expect(isSmallViewport(390, 844)).toBe(true);
		expect(isSmallViewport(844, 390)).toBe(true);
	});

	it('treats desktop viewports as large', () => {
		expect(isSmallViewport(1440, 900)).toBe(false);
	});

	it('uses the smallest dimension against the threshold', () => {
		expect(isSmallViewport(SMALL_SCREEN - 1, 1200)).toBe(true);
		expect(isSmallViewport(SMALL_SCREEN, 1200)).toBe(false);
	});
});
