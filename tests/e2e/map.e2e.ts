import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Map UI: the minimap renders in the HUD and the full island map opens with the
 * M shortcut (or the toolbar button), paints a canvas, and lists the biomes.
 */
test('map: minimap renders and the full map opens with M', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);

	// The minimap lives in the HUD and is painted from live world data.
	const minimap = page.getByLabel('Peta mini');
	await expect(minimap).toBeVisible();
	await expect(minimap.locator('canvas')).toBeVisible();

	// Open the full map with the M shortcut.
	await page.keyboard.press('m');
	const dialog = page.getByRole('dialog', { name: 'Peta pulau' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Peta Pulau')).toBeVisible();
	await expect(dialog.locator('canvas')).toBeVisible();

	// The legend lists every biome band.
	await expect(dialog.getByText('Pesisir Tropis')).toBeVisible();
	await expect(dialog.getByText('Kawah Vulkanik')).toBeVisible();

	// Close with Escape.
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('map: the toolbar button also opens and closes the map', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);

	await page.getByRole('button', { name: 'M · Peta' }).click();
	const dialog = page.getByRole('dialog', { name: 'Peta pulau' });
	await expect(dialog).toBeVisible();

	await page.getByRole('button', { name: 'Tutup', exact: true }).click();
	await expect(dialog).toBeHidden();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
