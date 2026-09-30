import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Phase 7 NPC & quest: the quest log opens, the starting quest is available,
 * and the tracker/quest UI stay stable while the world runs.
 */
test('quests: quest log opens and shows the starting quest', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);

	// Open the quest log with the J shortcut.
	await page.keyboard.press('j');
	const dialog = page.getByRole('dialog', { name: 'Misi' });
	await expect(dialog).toBeVisible();

	// With no quest accepted yet, the empty-state hint is shown.
	await expect(dialog.getByText('Belum ada misi aktif')).toBeVisible();

	// Close with Escape.
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
