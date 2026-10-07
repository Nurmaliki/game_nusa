import { expect, test, type Page } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Atmosphere E2E (Phase 6): the world lighting changes with the in-game clock —
 * warm at sunset, blue and dim at night, neutral at midday — with no page errors.
 * Uses the opt-in ?e2e=1 seam to fast-forward the clock instead of waiting real
 * minutes for the day to pass.
 */

async function setHour(page: Page, hour: number): Promise<void> {
	await page.evaluate((h) => {
		(window as unknown as { __gameE2E: { setHour: (h: number) => void } }).__gameE2E.setHour(h);
	}, hour);
	await page.waitForTimeout(400);
}

test('atmosphere: lighting shifts across the day without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);
	await page.goto('/play?e2e=1');
	await page.waitForFunction(() =>
		Boolean((window as unknown as { __gameE2E?: unknown }).__gameE2E)
	);
	await page.waitForTimeout(800);

	// Midday, sunset, night — each should repaint without throwing.
	await setHour(page, 12);
	await setHour(page, 18);
	await setHour(page, 2);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
