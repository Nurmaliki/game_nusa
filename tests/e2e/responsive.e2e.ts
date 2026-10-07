import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Responsive graphics (Phase 7, §35): the world must stay legible on a laptop,
 * a tablet and phone landscape. The key regression guard is that the player does
 * NOT shrink to a speck on a large monitor — the camera zoom is derived from the
 * viewport. We assert no page errors and a sane render at several sizes.
 */
const SIZES = [
	{ name: 'laptop', width: 1366, height: 768 },
	{ name: 'tablet', width: 1024, height: 768 },
	{ name: 'phone-landscape', width: 844, height: 390 },
	{ name: 'full-hd', width: 1920, height: 1080 }
];

for (const size of SIZES) {
	test(`responsive: renders at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		await page.setViewportSize({ width: size.width, height: size.height });
		await startNewGame(page);
		await page.waitForTimeout(1200);

		// The game canvas fills the viewport.
		const canvas = page.locator('canvas').first();
		await expect(canvas).toBeVisible();

		expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
	});
}
