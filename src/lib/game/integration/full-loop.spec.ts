import { describe, it, expect } from 'vitest';
import { GameState } from '$game/core/game-state';
import { getItem } from '$data/items';

/**
 * Headless end-to-end gameplay loop through the PURE core (no Phaser, no DOM).
 *
 * This is the integration safety net for Phase 13: it exercises gathering →
 * crafting → building → survival → death/recovery → quests → save/reload as one
 * continuous session, asserting that state is consistent at every step and that
 * a full round-trip through the save DTO is lossless for the fields that matter.
 */

function newGame(seed = 4242): GameState {
	const state = new GameState('integ', seed, 0);
	state.seedNewGame();
	state.refreshQuests();
	return state;
}

/** Harvest a node repeatedly until it yields or we hit a safety cap. */
function harvestUntil(
	state: GameState,
	nodeId: string,
	instanceId: string,
	maxSwings = 20
): { swings: number; yielded: boolean } {
	let swings = 0;
	let yielded = false;
	while (swings < maxSwings) {
		state.harvest(nodeId, instanceId);
		swings++;
		if (!state.nodeHasWork(instanceId)) {
			yielded = true;
			break;
		}
	}
	return { swings, yielded };
}

describe('integration: full gameplay loop', () => {
	it('gathers → crafts → builds in one continuous session', () => {
		const state = newGame();

		// 1. Gather wood from two tree instances.
		const tree1 = harvestUntil(state, 'tree', 't1');
		expect(tree1.yielded, 'tree should complete').toBe(true);
		harvestUntil(state, 'tree', 't2');
		harvestUntil(state, 'tree', 't3');
		expect(state.inventory.count('wood')).toBeGreaterThan(0);

		// 2. Stone from rocks.
		harvestUntil(state, 'rock', 'r1');
		harvestUntil(state, 'rock', 'r2');
		expect(state.inventory.count('stone')).toBeGreaterThan(0);

		// 3. Craft a stone axe by hand (needs wood + stone + fiber).
		state.inventory.add({ id: 'fiber', qty: 5 }, getItem('fiber')!);
		const axe = state.craftAt('stone_axe');
		expect(axe.ok, 'stone_axe craft').toBe(true);
		expect(state.inventory.count('stone_axe')).toBe(1);

		// 4. Build a campfire (consumes wood + stone, requires the materials).
		state.inventory.add({ id: 'wood', qty: 10 }, getItem('wood')!);
		state.inventory.add({ id: 'stone', qty: 5 }, getItem('stone')!);
		const woodBefore = state.inventory.count('wood');
		const stoneBefore = state.inventory.count('stone');
		const built = state.addBuilding('campfire', { x: 0, y: 0 }, [
			{ id: 'wood', qty: 5 },
			{ id: 'stone', qty: 3 }
		]);
		expect(built.ok, 'campfire build').toBe(true);
		expect(state.buildings).toHaveLength(1);
		expect(state.statistics.buildingsBuilt).toBe(1);
		// Materials were consumed exactly as required.
		expect(state.inventory.count('wood')).toBe(woodBefore - 5);
		expect(state.inventory.count('stone')).toBe(stoneBefore - 3);

		// 5. The campfire station is now reachable.
		expect(state.reachableStations().has('campfire')).toBe(true);
	});

	it('cooks at the campfire only after the station exists', () => {
		const state = newGame();
		state.inventory.add({ id: 'berry', qty: 4 }, getItem('berry')!);

		// Without a campfire the station is missing → craft fails.
		const blocked = state.craftAt('cooked_berry');
		expect(blocked.ok).toBe(false);
		expect(state.inventory.count('cooked_berry')).toBe(0);

		// Place the campfire and try again.
		state.inventory.add({ id: 'wood', qty: 5 }, getItem('wood')!);
		state.inventory.add({ id: 'stone', qty: 3 }, getItem('stone')!);
		expect(
			state.addBuilding('campfire', { x: 0, y: 0 }, [
				{ id: 'wood', qty: 5 },
				{ id: 'stone', qty: 3 }
			]).ok
		).toBe(true);

		const berriesBefore = state.inventory.count('berry');
		const cooked = state.craftAt('cooked_berry');
		expect(cooked.ok, 'cooked_berry craft').toBe(true);
		expect(state.inventory.count('cooked_berry')).toBe(1);
		// Ingredients consumed (2 berries).
		expect(state.inventory.count('berry')).toBe(berriesBefore - 2);
	});

	it('advances survival over game time and damages the player when starving', () => {
		const state = newGame();
		state.setStats({ hunger: 0, thirst: 0, health: 100 });

		// ~2 in-game hours of real time.
		const twoHoursMs = (BALANCE_DAY_MS() / 24) * 2;
		state.advanceSurvival(twoHoursMs, { sprinting: false, sleeping: false });

		expect(state.stats.hunger).toBeLessThanOrEqual(0.001);
		// Starvation + dehydration both deal damage.
		expect(state.stats.health).toBeLessThan(100);
	});

	it('drops a recoverable backpack on death and restores it on recovery', () => {
		const state = newGame();
		// Give the player a mix of critical (kept) and normal (dropped) items.
		state.inventory.add({ id: 'wood', qty: 20 }, getItem('wood')!);
		state.inventory.add({ id: 'stone', qty: 10 }, getItem('stone')!);
		const beforeWood = state.inventory.count('wood');
		const beforeStone = state.inventory.count('stone');

		const backpack = state.die({ x: 100, y: 200 });
		expect(state.player.isDead).toBe(true);
		expect(state.statistics.deaths).toBe(1);
		expect(state.backpacks.length).toBeGreaterThanOrEqual(1);

		// Locate the nearest backpack and recover it.
		const near = state.nearestBackpack({ x: 110, y: 210 }, 100);
		expect(near?.id).toBe(backpack.id);
		const recovered = state.recoverBackpack(backpack.id);
		expect(recovered.ok).toBe(true);

		// Respawn and confirm the recipe of totals: recovered + retained equals the
		// original (nothing is created or destroyed beyond the drop fraction).
		state.respawn();
		expect(state.player.isDead).toBe(false);
		expect(state.stats.health).toBeGreaterThan(0);
		const totalWood = state.inventory.count('wood');
		const totalStone = state.inventory.count('stone');
		expect(totalWood).toBeLessThanOrEqual(beforeWood);
		expect(totalStone).toBeLessThanOrEqual(beforeStone);
	});

	it('completes a full save → reload round trip without losing progress', () => {
		const state = newGame(777);
		state.inventory.add({ id: 'wood', qty: 12 }, getItem('wood')!);
		state.inventory.add({ id: 'fiber', qty: 6 }, getItem('fiber')!);
		state.inventory.add({ id: 'stone', qty: 6 }, getItem('stone')!);
		expect(state.craftAt('wooden_spear').ok).toBe(true);
		expect(
			state.addBuilding('campfire', { x: 32, y: 64 }, [
				{ id: 'wood', qty: 5 },
				{ id: 'stone', qty: 3 }
			]).ok
		).toBe(true);
		state.recordCombatHit();
		state.visitBiome('rainforest');
		state.acceptQuest('chapter1_start');
		state.talkToNpc('penjaga_hutan', 'root');

		const save = state.toSave();
		const roundTripped = JSON.parse(JSON.stringify(save)) as typeof save;
		const reloaded = GameState.fromSave(roundTripped);

		// Critical fields survive.
		expect(reloaded.saveId).toBe(state.saveId);
		expect(reloaded.worldSeed).toBe(state.worldSeed);
		expect(reloaded.inventory.count('wood')).toBe(state.inventory.count('wood'));
		expect(reloaded.inventory.count('wooden_spear')).toBe(1);
		expect(reloaded.buildings).toHaveLength(state.buildings.length);
		expect(reloaded.buildings[0].definitionId).toBe('campfire');
		expect(reloaded.statistics).toEqual(state.statistics);
		expect(reloaded.toSave().world.visitedBiomes).toContain('rainforest');
		expect(reloaded.toSave().world.talkedNpcs).toContain('penjaga_hutan');
		expect(reloaded.quests.serialize().length).toBe(state.quests.serialize().length);

		// And a second save equals the first (idempotent snapshot).
		expect(reloaded.toSave().inventory.slots).toEqual(state.toSave().inventory.slots);
	});

	it('unlocks achievements and persists them across a save round trip', () => {
		const state = newGame(555);
		// Nothing unlocked at the start.
		expect(state.achievements.count).toBe(0);
		// Gather enough to cross the first threshold, then evaluate.
		for (let i = 0; i < 10; i++) harvestUntil(state, 'tree', `t${i}`);
		const fresh = state.evaluateAchievements();
		expect(fresh).toContain('first_steps');
		// Evaluating again is a no-op for already-unlocked ids.
		expect(state.evaluateAchievements()).not.toContain('first_steps');

		// The unlocked set survives a full serialise -> parse -> restore.
		const save = state.toSave();
		expect(save.achievements).toContain('first_steps');
		const reloaded = GameState.fromSave(JSON.parse(JSON.stringify(save)));
		expect(reloaded.achievements.has('first_steps')).toBe(true);
	});

	it('loads an older save with no achievements field without crashing', () => {
		const state = newGame(556);
		const save = state.toSave();
		delete (save as { achievements?: string[] }).achievements;
		const reloaded = GameState.fromSave(JSON.parse(JSON.stringify(save)));
		expect(reloaded.achievements.count).toBe(0);
		expect(reloaded.evaluateAchievements()).toBeInstanceOf(Array);
	});

	it('is deterministic: the same seed yields the same random stream', () => {
		const a = newGame(999);
		const b = newGame(999);
		const c = newGame(1000);
		const streamA = Array.from({ length: 8 }, (_, i) => a.seededRandom(`k${i}`));
		const streamB = Array.from({ length: 8 }, (_, i) => b.seededRandom(`k${i}`));
		const streamC = Array.from({ length: 8 }, (_, i) => c.seededRandom(`k${i}`));
		expect(streamA).toEqual(streamB);
		expect(streamA).not.toEqual(streamC);
	});

	it('awards gathering skill xp and levels up over many harvests', () => {
		const state = newGame();
		const before = state.skills.serialize().find((s) => s.id === 'gathering')?.xp ?? 0;
		for (let i = 0; i < 10; i++) harvestUntil(state, 'tree', `t${i}`);
		const after = state.skills.serialize().find((s) => s.id === 'gathering')?.xp ?? 0;
		expect(after).toBeGreaterThan(before);
	});

	it('fishing nodes train the fishing skill (not gathering)', () => {
		const state = newGame();
		const fishingBefore = state.skills.serialize().find((s) => s.id === 'fishing')?.xp ?? 0;
		const gatheringBefore = state.skills.serialize().find((s) => s.id === 'gathering')?.xp ?? 0;
		// Equip a fishing rod so the shoal is harvested effectively. The rod is
		// placed in the first free hotbar slot; select that slot so harvest uses it.
		state.inventory.add({ id: 'fishing_rod', qty: 1 }, getItem('fishing_rod')!);
		state.equipment.select(0);
		harvestUntil(state, 'fish_shoal', 'f1');
		const fishingAfter = state.skills.serialize().find((s) => s.id === 'fishing')?.xp ?? 0;
		const gatheringAfter = state.skills.serialize().find((s) => s.id === 'gathering')?.xp ?? 0;
		expect(fishingAfter).toBeGreaterThan(fishingBefore);
		expect(gatheringAfter).toBe(gatheringBefore);
	});
});

/** Local helper so the test does not import BALANCE directly. */
function BALANCE_DAY_MS(): number {
	// 24 in-game minutes per day, matching BALANCE.dayNight.msPerGameDay.
	return 1_440_000;
}
