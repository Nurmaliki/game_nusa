import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * First-session onboarding: a brand-new game shows the guide; it can be skipped;
 * and it is remembered (never shown again) once dismissed.
 */
test('tutorial: shows for a new game and can be skipped + remembered', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);

	// The guide appears for a fresh player.
	const guide = page.getByRole('status', { name: 'Panduan' });
	await expect(guide).toBeVisible();
	await expect(guide.getByText('Panduan Awal')).toBeVisible();
	await expect(guide.getByText('Bergerak menjelajahi pantai')).toBeVisible();

	// Skipping hides it and persists the preference.
	await guide.getByRole('button', { name: 'Lewati panduan' }).click();
	await expect(guide).toBeHidden();

	// Reload: the guide must not reappear (settings persist in localStorage).
	await page.reload();
	await expect(page.locator('.game-root[data-engine-ready="true"]')).toBeAttached({
		timeout: 15000
	});
	await expect(page.getByRole('status', { name: 'Panduan' })).toBeHidden();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
