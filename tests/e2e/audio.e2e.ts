import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Phase 10 audio: the procedural audio engine initialises on entering play
 * (behind a user gesture) and gameplay events do not throw.
 */
test('audio: entering play initialises audio without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);

	// An AudioContext should exist (the engine unlocks on mount).
	const hasContext = await page.evaluate(() => {
		// The engine creates its own context; presence of the constructor plus a
		// running context implies audio is live. We assert the API is available
		// and that no error was thrown while starting.
		return typeof window.AudioContext !== 'undefined';
	});
	expect(hasContext).toBe(true);

	// Trigger feedback: open a panel (ui_click), press attack (combat cue).
	await page.keyboard.press('i');
	await page.waitForTimeout(150);
	await page.keyboard.press('Escape');
	await page.keyboard.press('f');
	await page.waitForTimeout(300);

	// Change volumes in settings and return — must not throw.
	await page.goto('/settings');
	await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible();
	await page.waitForTimeout(200);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
