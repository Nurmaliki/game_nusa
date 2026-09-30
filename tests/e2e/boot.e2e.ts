import { expect, test } from '@playwright/test';
import { waitForHydration } from './helpers';

/**
 * Phase 1 smoke test: the app boots to the menu, the world scene becomes ready,
 * and the HUD reflects the simulation clock. Guards against SSR/WebGL boot
 * regressions.
 */
test('boots to menu and starts the game', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await page.goto('/');
	await expect(page.getByRole('heading', { name: /NUSANTARA/i })).toBeVisible();
	await waitForHydration(page);

	await page.getByRole('button', { name: 'Game Baru' }).click();
	await expect(page).toHaveURL(/\/play/);

	// The HUD clock is driven by the Phaser simulation via the event bridge.
	await expect(page.locator('.clock .time')).toBeVisible();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
