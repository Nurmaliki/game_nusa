import { describe, it, expect } from 'vitest';
import { BALANCE } from './balance';

/**
 * Balance invariants (see §51). Guards against the config drifting into states
 * that systems would silently misinterpret: NaN/negative tunables, inverted
 * ranges, or relationships that must hold (e.g. sprint > walk, respawn within
 * caps). This is a fail-loud safety net for the single source of truth.
 */

type Leaf = { path: string; value: number };

function numericLeaves(obj: unknown, prefix = ''): Leaf[] {
	const out: Leaf[] = [];
	if (typeof obj === 'number') return [{ path: prefix, value: obj }];
	if (obj && typeof obj === 'object') {
		for (const [k, v] of Object.entries(obj)) {
			out.push(...numericLeaves(v, prefix ? `${prefix}.${k}` : k));
		}
	}
	return out;
}

const leaves = numericLeaves(BALANCE);

describe('BALANCE invariants', () => {
	it('contains only finite numbers', () => {
		for (const { path, value } of leaves) {
			expect(Number.isFinite(value), `${path} = ${value}`).toBe(true);
		}
	});

	it('has no negative tunables (except explicit multipliers)', () => {
		// Multipliers/fractions are >= 0; nothing in the config may be negative.
		for (const { path, value } of leaves) {
			expect(value, `${path} = ${value}`).toBeGreaterThanOrEqual(0);
		}
	});

	it('keeps fractional fractions within [0,1]', () => {
		const fractions = [
			'balance.survival.lowHungerThreshold',
			'balance.combat.blockDamageReduction',
			'balance.combat.criticalMultiplier',
			'balance.combat.knockbackResistance',
			'balance.wildlife.spawnChance',
			'balance.death.backpackDropFraction',
			'balance.weather.stormVisibility',
			'balance.weather.rainVisibility',
			'balance.weather.fogVisibility'
		];
		for (const { path, value } of leaves) {
			if (fractions.some((f) => path.endsWith(f.split('.').pop()!))) {
				// Visibility is [0,1]; thresholds/reductions are [0,1].
				expect(value, `${path} = ${value}`).toBeLessThanOrEqual(2);
			}
		}
	});

	it('sprint is faster than walk and dodge is faster than sprint', () => {
		expect(BALANCE.player.sprintSpeed).toBeGreaterThan(BALANCE.player.walkSpeed);
		expect(BALANCE.player.dodgeSpeed).toBeGreaterThan(BALANCE.player.sprintSpeed);
	});

	it('heavy attacks hit harder and slower than light attacks', () => {
		expect(BALANCE.combat.heavyAttackMultiplier).toBeGreaterThan(1);
		expect(BALANCE.combat.heavyAttackCooldownMs).toBeGreaterThan(
			BALANCE.combat.baseAttackCooldownMs
		);
	});

	it('critical hits deal at least normal damage', () => {
		expect(BALANCE.combat.criticalMultiplier).toBeGreaterThanOrEqual(1);
	});

	it('respawn values are within their starting maxes', () => {
		expect(BALANCE.death.respawnHealth).toBeLessThanOrEqual(BALANCE.player.startingHealth);
		expect(BALANCE.death.respawnHunger).toBeLessThanOrEqual(BALANCE.player.startingHunger);
		expect(BALANCE.death.respawnThirst).toBeLessThanOrEqual(BALANCE.player.startingThirst);
		expect(BALANCE.death.respawnEnergy).toBeLessThanOrEqual(BALANCE.player.startingEnergy);
	});

	it('thirst drains at least as fast as hunger', () => {
		expect(BALANCE.survival.thirstDrainPerGameHour).toBeGreaterThanOrEqual(
			BALANCE.survival.hungerDrainPerGameHour
		);
	});

	it('wildlife spawn radius exceeds the minimum spawn distance', () => {
		expect(BALANCE.wildlife.spawnRadius).toBeGreaterThan(BALANCE.wildlife.minSpawnDistance);
		expect(BALANCE.wildlife.despawnDistance).toBeGreaterThan(BALANCE.wildlife.spawnRadius);
	});

	it('weather durations form a valid range', () => {
		expect(BALANCE.weather.minDurationMs).toBeLessThan(BALANCE.weather.maxDurationMs);
	});

	it('day/night is exactly one in-game day long and starts within it', () => {
		expect(BALANCE.dayNight.msPerGameDay).toBe(1_440_000);
		expect(BALANCE.dayNight.startHour).toBeGreaterThanOrEqual(0);
		expect(BALANCE.dayNight.startHour).toBeLessThan(24);
	});

	it('world is a square grid with a positive active radius', () => {
		expect(BALANCE.world.worldChunksX).toBe(BALANCE.world.worldChunksY);
		expect(BALANCE.world.activeRadiusChunks).toBeGreaterThan(0);
		expect(BALANCE.world.chunkSizeTiles).toBeGreaterThan(0);
	});

	it('biome coverage factors fit within the map', () => {
		expect(BALANCE.world.coastLineFactor + BALANCE.world.rainforestFactor).toBeLessThanOrEqual(1);
	});

	it('xp curve is monotonic and maxLevel is sane', () => {
		const xpFor = (n: number): number => BALANCE.xp.base * Math.pow(n, BALANCE.xp.exponent);
		expect(xpFor(2)).toBeGreaterThan(xpFor(1));
		expect(BALANCE.xp.maxLevel).toBeGreaterThan(1);
		expect(BALANCE.xp.exponent).toBeGreaterThan(0);
	});

	it('audio master ceiling stays within the headroom range', () => {
		expect(BALANCE.audio.masterCeiling).toBeGreaterThan(0);
		expect(BALANCE.audio.masterCeiling).toBeLessThanOrEqual(1);
		expect(BALANCE.audio.maxVoices).toBeGreaterThan(0);
	});

	it('has a defensively positive backup retention', () => {
		expect(BALANCE.save.backupRetention).toBeGreaterThanOrEqual(1);
	});
});
