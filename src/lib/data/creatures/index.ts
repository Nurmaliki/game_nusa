import type { BiomeId } from '$types/core';

/**
 * Wildlife species definitions (data-driven, see §19 / §34).
 *
 * Each species has a combat profile (health/damage/speed) and a behaviour
 * profile (FSM tuning). Loot is a weighted drop table of item stacks.
 *
 * Behaviour is intentionally data-driven so new creatures need no code.
 */
export type CreatureBehaviour =
	| 'passive' // flees when attacked; never attacks (crab, monkey)
	| 'skittish' // flees when the player gets close, but may peck (seagull, hawk)
	| 'territorial' // attacks when the player enters its aggro radius (boar, snake)
	| 'predator'; // actively hunts the player within a large radius (tiger)

export interface LootEntry {
	itemId: string;
	/** Drop probability in [0,1]. */
	chance: number;
	min: number;
	max: number;
}

export interface CreatureDefinition {
	id: string;
	name: string;
	biome: BiomeId;
	/** Texture key for rendering. */
	texture: string;
	behaviour: CreatureBehaviour;

	// ── Combat profile ──────────────────────────────────────────────────
	health: number;
	/** Damage per successful hit on the player. */
	damage: number;
	/** Movement speed in px/second. */
	speed: number;
	/** Attack range in px. */
	attackRange: number;
	/** Minimum ms between attacks. */
	attackCooldownMs: number;
	/** Knocks the player back on hit. */
	knockback: number;
	/** XP awarded to the combat skill on kill. */
	xp: number;

	// ── AI tuning ───────────────────────────────────────────────────────
	/** Distance (px) at which the creature notices the player. */
	aggroRadius: number;
	/** Distance (px) beyond which it gives up and returns home. */
	leash: number;
	/** How far it wanders from its spawn anchor when idle. */
	wanderRadius: number;
	/** Whether it can be attacked back (all are, but kept for symmetry). */
	attackable: boolean;

	loot: LootEntry[];
}

export const CREATURES: Record<string, CreatureDefinition> = {
	// ── Tropical coast (tier 0: harmless starter fauna) ─────────────────
	crab: {
		id: 'crab',
		name: 'Kepiting',
		biome: 'tropical_coast',
		texture: 'placeholder_creature',
		behaviour: 'passive',
		health: 12,
		damage: 3,
		speed: 42,
		attackRange: 26,
		attackCooldownMs: 900,
		knockback: 40,
		xp: 8,
		aggroRadius: 60,
		leash: 160,
		wanderRadius: 90,
		attackable: true,
		loot: [
			{ itemId: 'shell', chance: 1, min: 1, max: 2 },
			{ itemId: 'meat', chance: 0.4, min: 1, max: 1 }
		]
	},
	seagull: {
		id: 'seagull',
		name: 'Camar',
		biome: 'tropical_coast',
		texture: 'placeholder_creature',
		behaviour: 'skittish',
		health: 8,
		damage: 2,
		speed: 70,
		attackRange: 24,
		attackCooldownMs: 1100,
		knockback: 30,
		xp: 6,
		aggroRadius: 90,
		leash: 260,
		wanderRadius: 140,
		attackable: true,
		loot: [
			{ itemId: 'feather', chance: 1, min: 1, max: 2 },
			{ itemId: 'meat', chance: 0.35, min: 1, max: 1 }
		]
	},

	// ── Rainforest (tier 1: moderate threat) ────────────────────────────
	boar: {
		id: 'boar',
		name: 'Babi Hutan',
		biome: 'rainforest',
		texture: 'placeholder_creature',
		behaviour: 'territorial',
		health: 34,
		damage: 12,
		speed: 66,
		attackRange: 36,
		attackCooldownMs: 1000,
		knockback: 90,
		xp: 18,
		aggroRadius: 130,
		leash: 320,
		wanderRadius: 120,
		attackable: true,
		loot: [
			{ itemId: 'meat', chance: 1, min: 1, max: 3 },
			{ itemId: 'hide', chance: 0.7, min: 1, max: 1 },
			{ itemId: 'boar_tusk', chance: 0.25, min: 1, max: 1 }
		]
	},
	monkey: {
		id: 'monkey',
		name: 'Monyet',
		biome: 'rainforest',
		texture: 'placeholder_creature',
		behaviour: 'passive',
		health: 18,
		damage: 5,
		speed: 88,
		attackRange: 28,
		attackCooldownMs: 800,
		knockback: 30,
		xp: 12,
		aggroRadius: 70,
		leash: 240,
		wanderRadius: 160,
		attackable: true,
		loot: [
			{ itemId: 'meat', chance: 0.6, min: 1, max: 1 },
			{ itemId: 'fiber', chance: 0.5, min: 1, max: 2 }
		]
	},
	snake: {
		id: 'snake',
		name: 'Ular Berbisa',
		biome: 'rainforest',
		texture: 'placeholder_creature',
		behaviour: 'territorial',
		health: 20,
		damage: 16,
		speed: 58,
		attackRange: 30,
		attackCooldownMs: 1200,
		knockback: 20,
		xp: 16,
		aggroRadius: 90,
		leash: 200,
		wanderRadius: 80,
		attackable: true,
		loot: [
			{ itemId: 'venom_sac', chance: 0.8, min: 1, max: 1 },
			{ itemId: 'meat', chance: 0.4, min: 1, max: 1 }
		]
	},

	// ── Highlands (tier 2: dangerous) ───────────────────────────────────
	hawk: {
		id: 'hawk',
		name: 'Elang',
		biome: 'highlands',
		texture: 'placeholder_creature',
		behaviour: 'skittish',
		health: 24,
		damage: 10,
		speed: 110,
		attackRange: 30,
		attackCooldownMs: 900,
		knockback: 40,
		xp: 20,
		aggroRadius: 150,
		leash: 380,
		wanderRadius: 200,
		attackable: true,
		loot: [
			{ itemId: 'feather', chance: 1, min: 2, max: 4 },
			{ itemId: 'meat', chance: 0.5, min: 1, max: 2 }
		]
	},
	tiger: {
		id: 'tiger',
		name: 'Harimau',
		biome: 'highlands',
		texture: 'placeholder_predator',
		behaviour: 'predator',
		health: 80,
		damage: 24,
		speed: 96,
		attackRange: 44,
		attackCooldownMs: 1300,
		knockback: 120,
		xp: 60,
		aggroRadius: 240,
		leash: 520,
		wanderRadius: 180,
		attackable: true,
		loot: [
			{ itemId: 'meat', chance: 1, min: 2, max: 4 },
			{ itemId: 'hide', chance: 1, min: 1, max: 2 },
			{ itemId: 'tiger_fang', chance: 0.5, min: 1, max: 1 }
		]
	},

	// ── Tropical coast (tier 1 elite: aquatic ambusher) ─────────────────
	crocodile: {
		id: 'crocodile',
		name: 'Buaya Muara',
		biome: 'tropical_coast',
		texture: 'placeholder_predator',
		behaviour: 'territorial',
		health: 60,
		damage: 20,
		speed: 62,
		attackRange: 40,
		attackCooldownMs: 1500,
		knockback: 110,
		xp: 40,
		aggroRadius: 160,
		leash: 400,
		wanderRadius: 100,
		attackable: true,
		loot: [
			{ itemId: 'croc_hide', chance: 0.8, min: 1, max: 1 },
			{ itemId: 'meat', chance: 1, min: 2, max: 3 }
		]
	},

	// ── Highlands (tier 2: pack predator) ───────────────────────────────
	wolf: {
		id: 'wolf',
		name: 'Serigala Kabut',
		biome: 'highlands',
		texture: 'placeholder_predator',
		behaviour: 'predator',
		health: 46,
		damage: 16,
		speed: 104,
		attackRange: 36,
		attackCooldownMs: 950,
		knockback: 70,
		xp: 34,
		aggroRadius: 220,
		leash: 480,
		wanderRadius: 200,
		attackable: true,
		loot: [
			{ itemId: 'wolf_pelt', chance: 0.7, min: 1, max: 1 },
			{ itemId: 'meat', chance: 1, min: 1, max: 3 }
		]
	}
};

export const CREATURE_LIST: CreatureDefinition[] = Object.values(CREATURES);

export function getCreature(id: string): CreatureDefinition | undefined {
	return CREATURES[id];
}
