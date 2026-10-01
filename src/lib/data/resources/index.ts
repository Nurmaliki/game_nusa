import type { BiomeId } from '$types/core';
import type { SkillId } from '$game/systems/skills';

/**
 * Resource node definitions (data-driven). A node type describes what drops,
 * how much work it needs, and whether it respawns.
 */
export interface ResourceNodeDefinition {
	id: string;
	/** Display name shown in the interaction prompt. */
	name: string;
	biome: BiomeId;
	/** Texture key for rendering. */
	texture: string;
	/** Total harvest "work" required (matched against tool gatherPower). */
	work: number;
	/** Item id -> quantity range yielded per completed harvest. */
	yields: { itemId: string; min: number; max: number }[];
	/** Tool kinds that are effective (empty = any tool/hand). */
	preferredTools: string[];
	/** Respawn policy. */
	respawn: { mode: 'never' } | { mode: 'after_hours'; hours: number };
	/** Does this node block movement? */
	solid: boolean;
	/**
	 * Skill trained when harvesting this node. Defaults to 'gathering'; fishing
	 * nodes (e.g. fish shoals) train 'fishing' instead, so the fishing skill can
	 * actually progress.
	 */
	skill?: SkillId;
}

export const RESOURCE_NODES: Record<string, ResourceNodeDefinition> = {
	tree: {
		id: 'tree',
		name: 'Pohon',
		biome: 'tropical_coast',
		texture: 'placeholder_tree',
		work: 3,
		yields: [{ itemId: 'wood', min: 2, max: 4 }],
		preferredTools: ['axe'],
		respawn: { mode: 'after_hours', hours: 12 },
		solid: true
	},
	hardwood_tree: {
		id: 'hardwood_tree',
		name: 'Pohon Keras',
		biome: 'rainforest',
		texture: 'placeholder_tree',
		work: 5,
		yields: [{ itemId: 'hardwood', min: 2, max: 3 }],
		preferredTools: ['axe'],
		respawn: { mode: 'after_hours', hours: 18 },
		solid: true
	},
	rock: {
		id: 'rock',
		name: 'Batu',
		biome: 'tropical_coast',
		texture: 'placeholder_rock',
		work: 4,
		yields: [{ itemId: 'stone', min: 2, max: 3 }],
		preferredTools: ['pickaxe'],
		respawn: { mode: 'after_hours', hours: 16 },
		solid: true
	},
	clay_mound: {
		id: 'clay_mound',
		name: 'Gundukan Liat',
		biome: 'rainforest',
		texture: 'placeholder_rock',
		work: 3,
		yields: [{ itemId: 'clay', min: 1, max: 3 }],
		preferredTools: ['pickaxe'],
		respawn: { mode: 'after_hours', hours: 20 },
		solid: false
	},
	bush: {
		id: 'bush',
		name: 'Semak',
		biome: 'tropical_coast',
		texture: 'placeholder_bush',
		work: 1,
		yields: [
			{ itemId: 'fiber', min: 1, max: 3 },
			{ itemId: 'berry', min: 0, max: 2 }
		],
		preferredTools: ['knife'],
		respawn: { mode: 'after_hours', hours: 8 },
		solid: false
	},
	herb_patch: {
		id: 'herb_patch',
		name: 'Tanaman Herba',
		biome: 'rainforest',
		texture: 'placeholder_bush',
		work: 1,
		yields: [{ itemId: 'herb', min: 1, max: 2 }],
		preferredTools: ['knife'],
		respawn: { mode: 'after_hours', hours: 14 },
		solid: false
	},
	palm: {
		id: 'palm',
		name: 'Pohon Kelapa',
		biome: 'tropical_coast',
		texture: 'placeholder_tree',
		work: 2,
		yields: [
			{ itemId: 'coconut', min: 1, max: 2 },
			{ itemId: 'wood', min: 1, max: 2 }
		],
		preferredTools: [],
		respawn: { mode: 'after_hours', hours: 24 },
		solid: true
	},
	shell_pile: {
		id: 'shell_pile',
		name: 'Tumpukan Kerang',
		biome: 'tropical_coast',
		texture: 'placeholder_rock',
		work: 1,
		yields: [{ itemId: 'shell', min: 1, max: 2 }],
		preferredTools: [],
		respawn: { mode: 'after_hours', hours: 10 },
		solid: false
	},
	iron_vein: {
		id: 'iron_vein',
		name: 'Urat Besi',
		biome: 'highlands',
		texture: 'placeholder_rock',
		work: 6,
		yields: [{ itemId: 'iron_ore', min: 1, max: 2 }],
		preferredTools: ['pickaxe'],
		respawn: { mode: 'after_hours', hours: 24 },
		solid: true
	},
	rare_plant: {
		id: 'rare_plant',
		name: 'Tanaman Langka',
		biome: 'highlands',
		texture: 'placeholder_bush',
		work: 2,
		yields: [{ itemId: 'herb', min: 1, max: 2 }],
		preferredTools: ['knife'],
		respawn: { mode: 'after_hours', hours: 30 },
		solid: false
	},
	ruin_cache: {
		id: 'ruin_cache',
		name: 'Reruntuhan Kuno',
		biome: 'highlands',
		texture: 'placeholder_rock',
		work: 8,
		yields: [
			{ itemId: 'ancient_fragment', min: 1, max: 1 },
			{ itemId: 'stone', min: 1, max: 3 }
		],
		preferredTools: ['pickaxe'],
		respawn: { mode: 'after_hours', hours: 48 },
		solid: true
	},
	salt_flat: {
		id: 'salt_flat',
		name: 'Rataan Garam',
		biome: 'tropical_coast',
		texture: 'placeholder_rock',
		work: 2,
		yields: [{ itemId: 'salt', min: 1, max: 3 }],
		preferredTools: ['hoe'],
		respawn: { mode: 'after_hours', hours: 20 },
		solid: false
	},
	sand_bank: {
		id: 'sand_bank',
		name: 'Gundukan Pasir',
		biome: 'tropical_coast',
		texture: 'placeholder_rock',
		work: 2,
		yields: [{ itemId: 'sand', min: 2, max: 4 }],
		preferredTools: ['hoe'],
		respawn: { mode: 'after_hours', hours: 16 },
		solid: false
	},
	bamboo_grove: {
		id: 'bamboo_grove',
		name: 'Rumpun Bambu',
		biome: 'rainforest',
		texture: 'placeholder_tree',
		work: 3,
		yields: [
			{ itemId: 'bamboo', min: 2, max: 4 },
			{ itemId: 'fiber', min: 0, max: 2 }
		],
		preferredTools: ['axe'],
		respawn: { mode: 'after_hours', hours: 14 },
		solid: true
	},
	mushroom_patch: {
		id: 'mushroom_patch',
		name: 'Rumpun Jamur',
		biome: 'rainforest',
		texture: 'placeholder_bush',
		work: 1,
		yields: [{ itemId: 'mushroom', min: 1, max: 3 }],
		preferredTools: ['knife'],
		respawn: { mode: 'after_hours', hours: 12 },
		solid: false
	},
	gold_vein: {
		id: 'gold_vein',
		name: 'Urat Emas',
		biome: 'highlands',
		texture: 'placeholder_rock',
		work: 10,
		yields: [
			{ itemId: 'gold_ore', min: 1, max: 2 },
			{ itemId: 'stone', min: 1, max: 2 }
		],
		preferredTools: ['pickaxe'],
		respawn: { mode: 'after_hours', hours: 60 },
		solid: true
	},
	fish_shoal: {
		id: 'fish_shoal',
		name: 'Kawanan Ikan',
		biome: 'tropical_coast',
		texture: 'placeholder_creature',
		work: 2,
		yields: [{ itemId: 'fish', min: 1, max: 3 }],
		preferredTools: ['fishing_rod'],
		respawn: { mode: 'after_hours', hours: 6 },
		solid: false,
		skill: 'fishing'
	},
	oyster_bed: {
		id: 'oyster_bed',
		name: 'Terumbu Tiram',
		biome: 'tropical_coast',
		texture: 'placeholder_rock',
		work: 4,
		yields: [
			{ itemId: 'pearl', min: 1, max: 1 },
			{ itemId: 'shell', min: 1, max: 2 }
		],
		preferredTools: ['knife'],
		respawn: { mode: 'after_hours', hours: 36 },
		solid: false
	},
	obsidian: {
		id: 'obsidian',
		name: 'Bebatuan Obsidian',
		biome: 'volcanic',
		texture: 'placeholder_rock',
		work: 12,
		yields: [
			{ itemId: 'obsidian_shard', min: 1, max: 2 },
			{ itemId: 'stone', min: 1, max: 3 }
		],
		preferredTools: ['pickaxe'],
		respawn: { mode: 'after_hours', hours: 48 },
		solid: true
	},
	sulfur_vent: {
		id: 'sulfur_vent',
		name: 'Semburan Belerang',
		biome: 'volcanic',
		texture: 'placeholder_rock',
		work: 3,
		yields: [{ itemId: 'sulfur', min: 1, max: 3 }],
		preferredTools: ['knife'],
		respawn: { mode: 'after_hours', hours: 20 },
		solid: false
	},
	rock_gem: {
		id: 'rock_gem',
		name: 'Urat Permata',
		biome: 'volcanic',
		texture: 'placeholder_rock',
		work: 16,
		yields: [
			{ itemId: 'gemstone', min: 1, max: 1 },
			{ itemId: 'obsidian_shard', min: 1, max: 2 }
		],
		preferredTools: ['pickaxe'],
		respawn: { mode: 'after_hours', hours: 72 },
		solid: true
	}
};

export const RESOURCE_NODE_LIST: ResourceNodeDefinition[] = Object.values(RESOURCE_NODES);

export function getResourceNode(id: string): ResourceNodeDefinition | undefined {
	return RESOURCE_NODES[id];
}
