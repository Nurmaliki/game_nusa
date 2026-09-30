import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Phase 6 combat & wildlife: the world spawns creatures and the player can
 * attack without crashing the simulation.
 */
test('combat: attack input and wildlife spawn are stable', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);
	// Let the world run so wildlife spawning is evaluated at least once.
	await page.waitForTimeout(1500);

	// Attack with the light-attack key several times.
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press('f');
		await page.waitForTimeout(120);
	}
	// Heavy attack.
	await page.keyboard.press('g');
	await page.waitForTimeout(300);

	// The HUD is still alive and the simulation is ticking.
	await expect(page.locator('.clock .time')).toBeVisible();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
