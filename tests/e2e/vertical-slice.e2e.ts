import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Phase 2 vertical slice: a new player can start, open the inventory and
 * crafting panels, and the game boot survives without page errors.
 */
test('vertical slice: new game, open panels, no page errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);

	// HUD clock is driven by the simulation bridge.
	await expect(page.locator('.clock .time')).toBeVisible();
	// Weather indicator is seeded and surfaced (starts clear).
	await expect(page.locator('.clock .weather')).toBeVisible();

	// Inventory panel toggles with the keyboard shortcut.
	await page.keyboard.press('i');
	await expect(page.getByRole('dialog', { name: 'Inventaris' })).toBeVisible();
	// Starting kit includes wood.
	await expect(page.getByRole('dialog', { name: 'Inventaris' }).getByText('Kayu')).toBeVisible();
	// Inventory QoL: the "Rapikan" (tidy) action is available and clickable.
	const tidy = page.getByRole('button', { name: 'Rapikan' });
	await expect(tidy).toBeVisible();
	await tidy.click();
	await expect(page.getByRole('dialog', { name: 'Inventaris' }).getByText('Kayu')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Inventaris' })).toBeHidden();

	// Crafting panel.
	await page.keyboard.press('c');
	await expect(page.getByRole('dialog', { name: 'Kerajinan' })).toBeVisible();
	await expect(page.getByText('Kapak Batu')).toBeVisible();
	await page.keyboard.press('Escape');

	// Hotbar responds to number keys.
	await expect(page.getByRole('toolbar', { name: 'Hotbar' })).toBeVisible();
	await page.keyboard.press('3');
	await expect(page.locator('.hotbar .slot').nth(2)).toHaveClass(/active/);

	// Building panel opens with B.
	await page.keyboard.press('b');
	await expect(page.getByRole('dialog', { name: 'Bangunan' })).toBeVisible();
	await expect(page.getByText('Api Unggun')).toBeVisible();
	await page.keyboard.press('Escape');

	// Skills panel opens with K.
	await page.keyboard.press('k');
	const skillsDialog = page.getByRole('dialog', { name: 'Keterampilan' });
	await expect(skillsDialog).toBeVisible();
	await expect(skillsDialog.getByText('Kerajinan')).toBeVisible();
	await page.keyboard.press('Escape');

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
