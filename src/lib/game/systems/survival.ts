import { BALANCE } from '../config/balance';

/**
 * Pure survival calculation (see §11 / §60).
 *
 * All numbers come from BALANCE. No engine dependencies — unit-testable.
 */
export interface SurvivalStats {
	health: number;
	hunger: number;
	thirst: number;
	energy: number;
}

export interface SurvivalCaps {
	maxHealth: number;
	maxHunger: number;
	maxThirst: number;
	maxEnergy: number;
}

export const DEFAULT_CAPS: SurvivalCaps = {
	maxHealth: 100,
	maxHunger: 100,
	maxThirst: 100,
	maxEnergy: 100
};

export function initialStats(): SurvivalStats {
	return {
		health: BALANCE.player.startingHealth,
		hunger: BALANCE.player.startingHunger,
		thirst: BALANCE.player.startingThirst,
		energy: BALANCE.player.startingEnergy
	};
}

function clampCaps(s: SurvivalStats, caps: SurvivalCaps): SurvivalStats {
	return {
		health: clamp(s.health, 0, caps.maxHealth),
		hunger: clamp(s.hunger, 0, caps.maxHunger),
		thirst: clamp(s.thirst, 0, caps.maxThirst),
		energy: clamp(s.energy, 0, caps.maxEnergy)
	};
}

export function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

export interface TickContext {
	/** In-game hours elapsed this tick. */
	gameHours: number;
	/** Whether the player is currently sprinting (extra energy drain). */
	sprinting: boolean;
	/** Whether the player is currently asleep (energy recovery). */
	sleeping?: boolean;
}

/**
 * Advance the survival stats by `gameHours`. Pure: returns a NEW stats object.
 * Rules (all configurable via BALANCE.survival):
 *  - hunger/thirst/energy drain over time
 *  - sprinting adds energy drain
 *  - low hunger slows energy regen
 *  - zero hunger / thirst damages health
 *  - well-fed + hydrated regenerates health
 *  - sleeping restores energy
 */
export function tickSurvival(
	stats: SurvivalStats,
	caps: SurvivalCaps,
	ctx: TickContext
): SurvivalStats {
	const h = ctx.gameHours;
	const b = BALANCE.survival;

	let { health, hunger, thirst, energy } = stats;

	// Base drains.
	hunger -= b.hungerDrainPerGameHour * h;
	thirst -= b.thirstDrainPerGameHour * h;
	energy -= b.energyDrainPerGameHour * h;

	if (ctx.sprinting) {
		energy -= BALANCE.player.sprintEnergyPerSec * h * 60;
	}

	// Energy regeneration (unless sleeping restores it separately).
	if (ctx.sleeping) {
		energy += b.energyRegenPerGameHour * 4 * h;
	} else {
		const hungerFrac = hunger / caps.maxHunger;
		const regenMult = hungerFrac < b.lowHungerThreshold ? b.lowHungerEnergyRegenMultiplier : 1;
		// Regen only applies while there is energy capacity and some hunger left.
		if (hunger > 0) energy += b.energyRegenPerGameHour * regenMult * h;
	}

	// Starvation / dehydration damage.
	if (hunger <= 0) health -= b.starveDamagePerGameHour * h;
	if (thirst <= 0) health -= b.dehydrateDamagePerGameHour * h;

	// Healthy regeneration.
	const healthy =
		hunger / caps.maxHunger >= b.healthyThreshold &&
		thirst / caps.maxThirst >= b.healthyThreshold &&
		!ctx.sprinting;
	if (healthy && health > 0) health += b.healthyRegenPerGameHour * h;

	return clampCaps({ health, hunger, thirst, energy }, caps);
}

/** Apply consumption effects (food/drink) to stats. Pure. */
export function applyEffects(
	stats: SurvivalStats,
	caps: SurvivalCaps,
	effects: { health?: number; hunger?: number; thirst?: number; energy?: number }
): SurvivalStats {
	return clampCaps(
		{
			health: stats.health + (effects.health ?? 0),
			hunger: stats.hunger + (effects.hunger ?? 0),
			thirst: stats.thirst + (effects.thirst ?? 0),
			energy: stats.energy + (effects.energy ?? 0)
		},
		caps
	);
}

export function isDead(stats: SurvivalStats): boolean {
	return stats.health <= 0;
}

/**
 * Compute respawn stats after death. Keeps quest progression safe (see §25/§53).
 */
export function respawnStats(): SurvivalStats {
	return {
		health: BALANCE.death.respawnHealth,
		hunger: BALANCE.death.respawnHunger,
		thirst: BALANCE.death.respawnThirst,
		energy: BALANCE.death.respawnEnergy
	};
}
