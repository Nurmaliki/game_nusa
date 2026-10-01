/**
 * Central balancing configuration (see §51).
 *
 * RULE: gameplay numbers MUST live here, never scattered across modules.
 * If a system needs a tunable number, add it here with a descriptive name.
 */
export const BALANCE = {
	player: {
		walkSpeed: 170,
		sprintSpeed: 290,
		sprintEnergyPerSec: 12,
		dodgeSpeed: 420,
		dodgeDurationMs: 220,
		dodgeCooldownMs: 650,
		dodgeEnergyCost: 14,
		/** Radius of the player physics body (px). */
		bodyRadius: 12,
		startingHealth: 100,
		startingHunger: 100,
		startingThirst: 100,
		startingEnergy: 100
	},

	survival: {
		// Per in-game hour drain rates (configured as seconds of real time via dayNight).
		hungerDrainPerGameHour: 5,
		thirstDrainPerGameHour: 7,
		energyDrainPerGameHour: 2,
		/** Energy regen per game hour when hunger is healthy. */
		energyRegenPerGameHour: 8,
		/** Hunger below this fraction slows energy regen. */
		lowHungerThreshold: 0.25,
		lowHungerEnergyRegenMultiplier: 0.35,
		/** Damage per game hour at zero hunger / thirst. */
		starveDamagePerGameHour: 6,
		dehydrateDamagePerGameHour: 10,
		/** Passive healing per game hour when well fed and hydrated. */
		healthyRegenPerGameHour: 4,
		healthyThreshold: 0.6
	},

	combat: {
		baseUnarmedDamage: 6,
		/** Reach of an unarmed attack (px). */
		unarmedRange: 40,
		baseAttackCooldownMs: 420,
		heavyAttackMultiplier: 1.9,
		heavyAttackCooldownMs: 780,
		heavyEnergyCost: 10,
		blockDamageReduction: 0.6,
		blockEnergyCostPerHit: 8,
		criticalMultiplier: 2,
		/** Player invulnerability window after taking a hit (ms). */
		invulnMs: 500,
		/** Player knockback resistance multiplier (0 = full knockback). */
		knockbackResistance: 0.35
	},

	wildlife: {
		/** Max active creatures spawned around the player at once. */
		maxActivePerChunk: 6,
		/** Creatures beyond this distance despawn. */
		despawnDistance: 1400,
		/** Spawn radius around the player, in px. */
		spawnRadius: 640,
		/** Do not spawn creatures closer than this to the player. */
		minSpawnDistance: 320,
		/** Chance per spawn evaluation that a biome spawns a creature. */
		spawnChance: 0.35,
		/** Real ms between spawn evaluations. */
		spawnIntervalMs: 2500,
		/** Base leash distance from spawn anchor. */
		defaultLeash: 420
	},

	resource: {
		baseGatherDamage: 4,
		/** Durability consumed per successful gather swing. */
		toolDurabilityPerHit: 1,
		/** Common nodes respawn after this many in-game hours. */
		commonRespawnHours: 12,
		interactRange: 56
	},

	crafting: {
		/** Crafting requires standing within this distance of a station. */
		stationRange: 72
	},

	building: {
		placementRange: 120,
		minSpacingToResource: 48
	},

	xp: {
		/** xpForLevel(n) = base * n^exponent (rounded). */
		base: 50,
		exponent: 1.5,
		maxLevel: 20
	},

	skills: {
		gatherXpPerHarvest: 5,
		craftXpPerCraft: 8,
		fishXpPerCatch: 10,
		huntXpPerKill: 15,
		combatXpPerHit: 2,
		exploreXpPerChunk: 3
	},

	/** Presentation-only "game feel" tunables (no gameplay effect). */
	feedback: {
		/** Floating combat/damage numbers drift this far up before fading. */
		floatRisePx: 34,
		floatDurationMs: 750,
		/** Dust/impact particle burst count and lifetime. */
		hitParticles: 6,
		particleLifeMs: 380,
		particleSpeed: 60,
		/** Idle "bob" applied to living sprites (px amplitude + period). */
		idleBobPx: 1.5,
		idleBobPeriodMs: 1400
	},

	weather: {
		minDurationMs: 60_000,
		maxDurationMs: 180_000,
		rainWaterBonus: 1.5,
		rainFishingModifier: 1.2,
		rainFireEfficiency: 0.6,
		stormVisibility: 0.45,
		rainVisibility: 0.7,
		fogVisibility: 0.5
	},

	dayNight: {
		/** Real milliseconds per full in-game day (24 min => 1440000 ms). */
		msPerGameDay: 1_440_000,
		startHour: 6
	},

	world: {
		tileSize: 32,
		chunkSizeTiles: 32,
		activeRadiusChunks: 2,
		worldChunksX: 16,
		worldChunksY: 16,
		coastLineFactor: 0.32,
		rainforestFactor: 0.34,
		/** Resource nodes placed per chunk (inclusive range), deterministic. */
		nodeDensityMin: 14,
		nodeDensityMax: 20,
		/** Minimum world-pixel spacing enforced between nodes in a chunk. */
		nodeMinSpacing: 52,
		/**
		 * Per-node-type sprite scale. Landmark props (trees, rocks, ore) are
		 * drawn at ~1.5 tiles tall so the island reads as populated rather than
		 * sparse; ground plants and small creatures stay near true size. Keys
		 * are resource-node type ids; anything unlisted uses `default`.
		 */
		nodeSpriteScale: {
			default: 1,
			tree: 1.5,
			palm: 1.5,
			hardwood_tree: 1.6,
			pine: 1.5,
			bamboo_grove: 1.4,
			rock: 1.25,
			iron_vein: 1.3,
			gold_vein: 1.3,
			ruin_cache: 1.2,
			clay_mound: 1.2
		} as Record<string, number>
	},

	camera: {
		followLerp: 0.12,
		shakeIntensity: 0.006
	},

	save: {
		autosaveIntervalMs: 45_000,
		backupRetention: 2
	},

	death: {
		respawnHealth: 75,
		respawnHunger: 50,
		respawnThirst: 50,
		respawnEnergy: 50,
		/** Fraction of (non-critical) inventory dropped as a backpack. */
		backpackDropFraction: 0.5
	},

	audio: {
		/** Master output ceiling applied on top of the user's master volume. */
		masterCeiling: 0.9,
		/** Ambient music crossfade / drift timing. */
		musicFadeMs: 1500,
		/** Minimum ms between footstep sounds while moving. */
		footstepIntervalMs: 340,
		/** Maximum simultaneous one-shot voices before oldest is dropped. */
		maxVoices: 12
	}
} as const;

export type Balance = typeof BALANCE;
