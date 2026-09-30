import { describe, it, expect } from 'vitest';
import { WildlifeManager, type SpawnContext } from './wildlife';
import { getCreature } from '$data/creatures';
import { BALANCE } from '../config/balance';

function seq(values: number[]): () => number {
	let i = 0;
	return () => values[i++ % values.length];
}

const ctx: SpawnContext = {
	playerPos: { x: 500, y: 500 },
	biomeAt: () => 'rainforest',
	worldWidth: 4000,
	worldHeight: 4000
};

describe('WildlifeManager spawning', () => {
	it('spawns a creature within the configured radius', () => {
		const wm = new WildlifeManager(seq([0.0, 0.5, 0.0]));
		// spawnChance check requires rng() <= 0.35 first; seq(0) passes.
		wm.maybeSpawn(ctx, BALANCE.wildlife.spawnIntervalMs + 1);
		expect(wm.count()).toBe(1);
		const c = wm.all()[0];
		const d = Math.hypot(c.position.x - 500, c.position.y - 500);
		expect(d).toBeGreaterThanOrEqual(BALANCE.wildlife.minSpawnDistance - 1);
		expect(d).toBeLessThanOrEqual(BALANCE.wildlife.spawnRadius + 1);
	});

	it('does not spawn faster than the interval', () => {
		const wm = new WildlifeManager(seq([0]));
		wm.maybeSpawn(ctx, 0);
		wm.maybeSpawn(ctx, 10); // within interval
		expect(wm.count()).toBeLessThanOrEqual(1);
	});

	it('respects the population cap', () => {
		const wm = new WildlifeManager(seq([0]));
		for (let t = 0; t < 100; t++) {
			wm.maybeSpawn(ctx, t * (BALANCE.wildlife.spawnIntervalMs + 1));
		}
		expect(wm.count()).toBeLessThanOrEqual(BALANCE.wildlife.maxActivePerChunk);
	});

	it('never spawns beyond world bounds', () => {
		const wm = new WildlifeManager(seq([0]));
		for (let t = 0; t < 20; t++) {
			wm.maybeSpawn(ctx, t * (BALANCE.wildlife.spawnIntervalMs + 1));
		}
		for (const c of wm.all()) {
			expect(c.position.x).toBeGreaterThanOrEqual(0);
			expect(c.position.y).toBeGreaterThanOrEqual(0);
			expect(c.position.x).toBeLessThanOrEqual(ctx.worldWidth);
			expect(c.position.y).toBeLessThanOrEqual(ctx.worldHeight);
		}
	});
});

describe('WildlifeManager combat integration', () => {
	it('damages the nearest creature and kills it at zero health', () => {
		const wm = new WildlifeManager(seq([0]));
		const boar = getCreature('boar')!;
		wm.spawn(boar, { x: 510, y: 500 });
		const hit = wm.damageNearest({ x: 500, y: 500 }, 100, boar.health);
		expect(hit?.health).toBe(0);
		expect(hit?.state).toBe('dead');
		const reaped = wm.reapDead();
		expect(reaped).toHaveLength(1);
		expect(wm.count()).toBe(0);
	});

	it('returns null when nothing is in range', () => {
		const wm = new WildlifeManager(seq([0]));
		wm.spawn(getCreature('crab')!, { x: 9999, y: 9999 });
		expect(wm.damageNearest({ x: 0, y: 0 }, 50, 10)).toBeNull();
	});

	it('despawns creatures beyond the despawn distance', () => {
		const wm = new WildlifeManager(seq([0]));
		wm.spawn(getCreature('tiger')!, { x: 9000, y: 9000 });
		wm.maybeSpawn(ctx, BALANCE.wildlife.spawnIntervalMs + 1);
		expect(wm.all().some((c) => c.position.x === 9000)).toBe(false);
	});

	it('reports attacks from aggressive creatures within range', () => {
		const wm = new WildlifeManager(seq([0.5]));
		const boar = getCreature('boar')!;
		const c = wm.spawn(boar, { x: 20, y: 0 });
		c.state = 'chase';
		const attacks = wm.step({ x: 0, y: 0 }, true, 16, 100000);
		expect(attacks.length).toBeGreaterThanOrEqual(0);
		// Eventually it should attack; step enough ticks.
		let attacked = attacks.length > 0;
		for (let t = 0; t < 50 && !attacked; t++) {
			const a = wm.step({ x: 0, y: 0 }, true, 16, 100000 + t * 200);
			attacked = a.length > 0;
		}
		expect(attacked).toBe(true);
	});

	it('reaps only dead creatures from a mixed population (in-place compaction)', () => {
		const wm = new WildlifeManager(seq([0]));
		const crab = getCreature('crab')!;
		const a = wm.spawn(crab, { x: 10, y: 10 });
		wm.spawn(crab, { x: 20, y: 20 });
		const c = wm.spawn(crab, { x: 30, y: 30 });
		a.state = 'dead';
		c.state = 'dead';
		const reaped = wm.reapDead();
		expect(reaped).toHaveLength(2);
		expect(wm.count()).toBe(1);
		expect(wm.all()[0].position.x).toBe(20);
	});

	it('step reuses the position object instead of allocating a new one each tick', () => {
		const wm = new WildlifeManager(seq([0.5]));
		const c = wm.spawn(getCreature('boar')!, { x: 100, y: 100 });
		const posRef = c.position;
		wm.step({ x: 0, y: 0 }, true, 16, 100000);
		// The AI returns a shallow copy that shares the same position object, and
		// the integration step mutates it in place rather than reallocating.
		expect(wm.all()[0].position).toBe(posRef);
	});

	it('despawnFar keeps only creatures within the despawn radius', () => {
		const wm = new WildlifeManager(seq([0]));
		const crab = getCreature('crab')!;
		wm.spawn(crab, { x: 500, y: 500 });
		wm.spawn(crab, { x: 500 + BALANCE.wildlife.despawnDistance + 10, y: 500 });
		// maybeSpawn triggers despawnFar first.
		wm.maybeSpawn(ctx, BALANCE.wildlife.spawnIntervalMs + 1);
		for (const c of wm.all()) {
			const d = Math.hypot(c.position.x - 500, c.position.y - 500);
			expect(d).toBeLessThanOrEqual(BALANCE.wildlife.despawnDistance);
		}
	});
});
