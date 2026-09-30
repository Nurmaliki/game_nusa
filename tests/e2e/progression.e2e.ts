import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Phase 8 main progression: from a fresh game, drive the Chapter I quest chain
 * to completion through the public quest API and assert the chapter-complete
 * ending overlay appears with no page errors.
 */
test('progression: main quest chain reaches CHAPTER I COMPLETE', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);
	// Reload with the test seam enabled so the driver is available.
	await page.goto('/play?e2e=1');
	await page.waitForFunction(() => {
		const w = window as unknown as { __gameE2E?: unknown };
		return Boolean(w.__gameE2E);
	});

	// Chapter I chain: start -> iron -> hunt, and gather -> boat.
	const result = await page.evaluate(() => {
		const g = (
			window as unknown as {
				__gameE2E: {
					grant: (id: string, qty: number) => void;
					place: (id: string) => void;
					craft: (id: string) => { ok: boolean } | undefined;
					acceptQuest: (id: string) => { ok: boolean } | undefined;
					turnInQuest: (id: string) => { ok: boolean } | undefined;
					talk: (id: string) => void;
					defeat: (id: string, count: number) => void;
					completeChapter: () => void;
				};
			}
		).__gameE2E;

		// Quest 1: Langkah Pertama (gather wood/stone, build campfire).
		g.acceptQuest('chapter1_start');
		g.grant('wood', 10);
		g.grant('stone', 5);
		g.place('campfire');
		const q1 = g.turnInQuest('chapter1_start');

		// Quest 2: Menjaga Hutan (gather fiber/herb, talk to Sari).
		g.acceptQuest('chapter1_gather');
		g.grant('fiber', 15);
		g.grant('herb', 5);
		g.talk('penjaga_hutan');
		const q2 = g.turnInQuest('chapter1_gather');

		// Quest 3: Besi Gunung (craft iron ingots at a workbench).
		g.acceptQuest('chapter1_iron');
		g.place('workbench');
		g.grant('iron_ore', 12);
		for (let i = 0; i < 3; i++) g.craft('iron_ingot');
		const q3 = g.turnInQuest('chapter1_iron');

		// Quest 4: Penjaga Pulau (defeat 2 boars).
		g.acceptQuest('chapter1_hunt');
		g.defeat('boar', 2);
		const q4 = g.turnInQuest('chapter1_hunt');

		// Quest 5: Kapal Layar (fragments, boat workshop, sailing boat).
		g.acceptQuest('chapter1_boat');
		// Grant 6 fragments: 3 are consumed crafting the boat, 3 remain for the
		// "gather 3 fragments" objective (which does not consume).
		g.grant('ancient_fragment', 6);
		g.place('boat_workshop');
		g.grant('sail_cloth', 1);
		g.grant('hull_plank', 2);
		g.craft('sailing_boat');
		const q5 = g.turnInQuest('chapter1_boat');

		return {
			q1: q1?.ok ?? false,
			q2: q2?.ok ?? false,
			q3: q3?.ok ?? false,
			q4: q4?.ok ?? false,
			q5: q5?.ok ?? false
		};
	});

	expect(result.q1, 'quest 1 turn-in').toBe(true);
	expect(result.q2, 'quest 2 turn-in').toBe(true);
	expect(result.q3, 'quest 3 turn-in').toBe(true);
	expect(result.q4, 'quest 4 turn-in').toBe(true);
	expect(result.q5, 'quest 5 turn-in (final)').toBe(true);

	// The final quest turn-in sets the chapter complete and emits the ending.
	const ending = page.getByRole('alertdialog', { name: 'Bab I Selesai' });
	await expect(ending).toBeVisible();
	await expect(ending.getByText('BAB I SELESAI')).toBeVisible();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
