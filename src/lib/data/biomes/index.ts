/**
 * Biome definitions (data-driven, see §7 / §31).
 *
 * The island is arranged as concentric biome bands from the coast (outer) to
 * the highlands (inner). Biome membership is determined deterministically from
 * the tile's position relative to the island centre + world seed jitter.
 */
export interface BiomeDefinition {
	id: 'tropical_coast' | 'rainforest' | 'highlands' | 'volcanic';
	name: string;
	/** Ordered difficulty tier (0 = starter). */
	tier: number;
	/** Normalised distance from island centre where this biome starts. */
	startRadius: number;
	/** Ground tile colour (placeholder palette). */
	groundColor: number;
	groundColorAlt: number;
	/** Ambient tint applied as an overlay (0xRRGGBB) and its max alpha. */
	ambientTint: number;
	ambientAlpha: number;
	/** Resource node type ids that spawn in this biome. */
	resourceTypes: string[];
	/** Relative spawn weights for the biome's resource types. */
	resourceWeights: Record<string, number>;
	/** Wildlife species ids (Phase 6). */
	wildlife: string[];
	/** Base threat level (0..1), drives wildlife aggression later. */
	threat: number;
}

export const BIOMES: Record<string, BiomeDefinition> = {
	tropical_coast: {
		id: 'tropical_coast',
		name: 'Pesisir Tropis',
		tier: 0,
		startRadius: 0,
		groundColor: 0x4a7d5a,
		groundColorAlt: 0x3f6e4e,
		ambientTint: 0x0a1436,
		ambientAlpha: 0.2,
		resourceTypes: [
			'tree',
			'bush',
			'rock',
			'palm',
			'shell_pile',
			'salt_flat',
			'sand_bank',
			'fish_shoal',
			'oyster_bed'
		],
		resourceWeights: {
			tree: 24,
			bush: 20,
			rock: 16,
			palm: 12,
			shell_pile: 8,
			salt_flat: 6,
			sand_bank: 8,
			fish_shoal: 10,
			oyster_bed: 4
		},
		wildlife: ['crab', 'seagull', 'crocodile'],
		threat: 0.18
	},
	rainforest: {
		id: 'rainforest',
		name: 'Hutan Hujan',
		tier: 1,
		startRadius: 0.42,
		groundColor: 0x2f6b45,
		groundColorAlt: 0x275e3b,
		ambientTint: 0x04140d,
		ambientAlpha: 0.24,
		resourceTypes: [
			'hardwood_tree',
			'herb_patch',
			'clay_mound',
			'bush',
			'bamboo_grove',
			'mushroom_patch'
		],
		resourceWeights: {
			hardwood_tree: 24,
			herb_patch: 16,
			clay_mound: 12,
			bush: 10,
			bamboo_grove: 14,
			mushroom_patch: 10
		},
		wildlife: ['boar', 'monkey', 'snake'],
		threat: 0.45
	},
	highlands: {
		id: 'highlands',
		name: 'Dataran Tinggi',
		tier: 2,
		startRadius: 0.74,
		groundColor: 0x5a5a66,
		groundColorAlt: 0x4e4e59,
		ambientTint: 0x0a0a1a,
		ambientAlpha: 0.16,
		resourceTypes: ['rock', 'iron_vein', 'rare_plant', 'ruin_cache', 'gold_vein'],
		resourceWeights: { rock: 16, iron_vein: 18, rare_plant: 8, ruin_cache: 4, gold_vein: 3 },
		wildlife: ['hawk', 'tiger', 'wolf'],
		threat: 0.85
	},
	volcanic: {
		id: 'volcanic',
		name: 'Kawah Vulkanik',
		tier: 3,
		startRadius: 0.9,
		groundColor: 0x3a2f33,
		groundColorAlt: 0x2e2529,
		ambientTint: 0x2a0a04,
		ambientAlpha: 0.22,
		resourceTypes: ['obsidian', 'sulfur_vent', 'rock_gem'],
		resourceWeights: { obsidian: 18, sulfur_vent: 12, rock_gem: 5 },
		wildlife: ['komodo'],
		threat: 1
	}
};

export const BIOME_LIST: BiomeDefinition[] = Object.values(BIOMES);

export function getBiome(id: string): BiomeDefinition | undefined {
	return BIOMES[id];
}
