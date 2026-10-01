import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

type Seam = {
	grant: (id: string, qty: number) => void;
	defeat: (id: string, count: number) => void;
	evaluateAchievements: () => string[];
	achievements: () => string[];
};

/**
 * End-game loop: achievements evaluate against lifetime progress, unlock once,
 * and surface in the panel. Drives the public E2E seam.
 */
test('achievements: unlock from progress and show in the panel', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);
	await page.goto('/play?e2e=1');
	await page.waitForFunction(() => {
		const w = window as unknown as { __gameE2E?: unknown };
		return Boolean(w.__gameE2E);
	});

	const result = await page.evaluate(() => {
		const g = (window as unknown as { __gameE2E: Seam }).__gameE2E;
		const before = g.achievements();
		// 25 defeats unlocks 'slayer' (the creature id is only used for counters).
		g.defeat('boar', 26);
		const fresh = g.evaluateAchievements();
		// A second evaluation must not re-report the same unlock.
		const second = g.evaluateAchievements();
		return { before, fresh, second, after: g.achievements() };
	});

	expect(result.before).toEqual([]);
	expect(result.fresh).toContain('slayer');
	expect(result.second).not.toContain('slayer');
	expect(result.after).toContain('slayer');

	// The panel opens (keyboard 'P'), shows the counter and the unlocked entry.
	await page.keyboard.press('p');
	const panel = page.getByRole('dialog', { name: 'Pencapaian' });
	await expect(panel).toBeVisible();
	await expect(panel.getByText('Pemburu')).toBeVisible();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
