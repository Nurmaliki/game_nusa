import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Phase 13: a realistic new-player loop driven through the public gameplay API
 * (gather → craft → build → save). Unlike the grant-based progression test, this
 * exercises the actual harvest/craft/build/save paths, then verifies the result
 * is durably persisted in IndexedDB (survives leaving to the menu and a reload).
 */
test('new player: gather → craft → build → save persists to storage', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);
	await page.goto('/play?e2e=1');
	await page.waitForFunction(() => {
		const w = window as unknown as { __gameE2E?: unknown };
		return Boolean(w.__gameE2E);
	});

	// Drive a real gather → craft → build sequence.
	const result = await page.evaluate(() => {
		const g = (
			window as unknown as {
				__gameE2E: {
					harvest: (nodeId: string, instanceId: string) => { ok: boolean } | undefined;
					grant: (id: string, qty: number) => void;
					craft: (id: string) => { ok: boolean } | undefined;
					place: (id: string) => void;
					count: (id: string) => number;
					save: () => Promise<{ ok: boolean }>;
					buildings: () => number;
				};
			}
		).__gameE2E;

		const swings: boolean[] = [];
		for (const id of ['t1', 't2', 't3', 't4']) {
			swings.push(g.harvest('tree', id)?.ok ?? false);
		}
		for (const id of ['r1', 'r2', 'r3']) {
			g.harvest('rock', id);
		}
		// The harvest above proves the gathering path works; the remaining
		// materials are granted so the test focuses on craft → build → persist
		// rather than RNG yield amounts.
		g.grant('wood', 12);
		g.grant('stone', 8);
		g.grant('fiber', 10);
		const crafted = g.craft('stone_axe')?.ok ?? false;
		g.place('campfire');
		return {
			swings,
			crafted,
			built: g.buildings(),
			axe: g.count('stone_axe')
		};
	});

	expect(result.swings.some(Boolean), 'at least one harvest succeeded').toBe(true);
	expect(result.crafted, 'stone_axe crafted').toBe(true);
	expect(result.built, 'campfire placed').toBeGreaterThanOrEqual(1);
	expect(result.axe).toBeGreaterThanOrEqual(1);

	// Save, then leave to the menu (the exit path saves synchronously).
	const saved = await page.evaluate(async () => {
		const g = (window as unknown as { __gameE2E: { save: () => Promise<{ ok: boolean }> } })
			.__gameE2E;
		return g.save();
	});
	expect(saved.ok).toBe(true);

	await page.getByRole('button', { name: 'Keluar' }).click();
	await expect(page).toHaveURL(/\/$/);

	// Verify persistence at the storage layer: the slot's snapshot and its menu
	// summary must exist, and the snapshot must contain the crafted axe + campfire.
	const persisted = await page.evaluate(async () => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('nusantara');
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const readAll = (store: string) =>
			new Promise<unknown[]>((resolve, reject) => {
				const tx = db.transaction(store, 'readonly');
				const req = tx.objectStore(store).getAll();
				req.onsuccess = () => resolve(req.result as unknown[]);
				req.onerror = () => reject(req.error);
			});
		const saves = await readAll('saves');
		const meta = await readAll('meta');
		return { saves, metaCount: meta.length };
	});

	expect(persisted.metaCount, 'a slot summary was written').toBeGreaterThanOrEqual(1);
	expect(persisted.saves.length, 'a save snapshot was written').toBeGreaterThanOrEqual(1);

	const snapshot = JSON.stringify(persisted.saves);
	expect(snapshot, 'persisted save contains the stone axe').toContain('stone_axe');
	expect(snapshot, 'persisted save contains the campfire').toContain('campfire');

	// A full reload still lists the slot in the menu.
	await page.reload();
	await expect(page.getByRole('button', { name: 'Lanjut' }).first()).toBeVisible();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});
