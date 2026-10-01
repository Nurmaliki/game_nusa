import type { ItemStack } from '$types/items';

/**
 * Crafting recipe definitions (data-driven, see §17 / §31).
 *
 * A recipe consumes `ingredients` atomically and produces `outputs` at a
 * `station`. `unlock` gates visibility; `skillRequirement` gates success.
 */
export interface RecipeDefinition {
	id: string;
	name: string;
	/** Station required. 'hand' means craftable anywhere. */
	station:
		'hand' | 'campfire' | 'workbench' | 'cooking_station' | 'boat_workshop' | 'obsidian_forge';
	ingredients: ItemStack[];
	outputs: ItemStack[];
	/** Real-time crafting duration in ms (0 = instant). */
	durationMs: number;
	/** Optional unlock requirement (skill flags). */
	unlock?: { skill?: { id: string; level: number } };
	/** Optional skill requirement checked at craft time. */
	skillRequirement?: { id: string; level: number };
}

export const RECIPES: Record<string, RecipeDefinition> = {
	// ── Hand crafting: tools ────────────────────────────────────────────
	stone_axe: {
		id: 'stone_axe',
		name: 'Kapak Batu',
		station: 'hand',
		ingredients: [
			{ id: 'wood', qty: 3 },
			{ id: 'stone', qty: 2 },
			{ id: 'fiber', qty: 2 }
		],
		outputs: [{ id: 'stone_axe', qty: 1, durability: 60 }],
		durationMs: 800
	},
	stone_pickaxe: {
		id: 'stone_pickaxe',
		name: 'Beliung Batu',
		station: 'hand',
		ingredients: [
			{ id: 'wood', qty: 3 },
			{ id: 'stone', qty: 3 },
			{ id: 'fiber', qty: 2 }
		],
		outputs: [{ id: 'stone_pickaxe', qty: 1, durability: 60 }],
		durationMs: 800
	},
	stone_knife: {
		id: 'stone_knife',
		name: 'Pisau Batu',
		station: 'hand',
		ingredients: [
			{ id: 'wood', qty: 1 },
			{ id: 'stone', qty: 2 },
			{ id: 'fiber', qty: 1 }
		],
		outputs: [{ id: 'stone_knife', qty: 1, durability: 50 }],
		durationMs: 600
	},
	fishing_rod: {
		id: 'fishing_rod',
		name: 'Pancing',
		station: 'hand',
		ingredients: [
			{ id: 'wood', qty: 2 },
			{ id: 'fiber', qty: 3 }
		],
		outputs: [{ id: 'fishing_rod', qty: 1, durability: 40 }],
		durationMs: 700
	},
	wooden_spear: {
		id: 'wooden_spear',
		name: 'Tombak Kayu',
		station: 'hand',
		ingredients: [
			{ id: 'wood', qty: 4 },
			{ id: 'fiber', qty: 2 }
		],
		outputs: [{ id: 'wooden_spear', qty: 1, durability: 45 }],
		durationMs: 700
	},

	// ── Campfire: cooking & water ───────────────────────────────────────
	cooked_berry: {
		id: 'cooked_berry',
		name: 'Beri Panggang',
		station: 'campfire',
		ingredients: [{ id: 'berry', qty: 2 }],
		outputs: [{ id: 'cooked_berry', qty: 1 }],
		durationMs: 500
	},
	cooked_fish: {
		id: 'cooked_fish',
		name: 'Ikan Bakar',
		station: 'campfire',
		ingredients: [{ id: 'fish', qty: 1 }],
		outputs: [{ id: 'cooked_fish', qty: 1 }],
		durationMs: 600
	},
	cooked_meat: {
		id: 'cooked_meat',
		name: 'Daging Bakar',
		station: 'campfire',
		ingredients: [{ id: 'meat', qty: 1 }],
		outputs: [{ id: 'cooked_meat', qty: 1 }],
		durationMs: 700
	},
	water_flask: {
		id: 'water_flask',
		name: 'Air Bersih',
		station: 'campfire',
		ingredients: [{ id: 'coconut', qty: 1 }],
		outputs: [{ id: 'water_flask', qty: 1 }],
		durationMs: 500
	},

	// ── Workbench: metal & advanced tools/weapons ───────────────────────
	iron_ingot: {
		id: 'iron_ingot',
		name: 'Batang Besi',
		station: 'workbench',
		ingredients: [{ id: 'iron_ore', qty: 2 }],
		outputs: [{ id: 'iron_ingot', qty: 1 }],
		durationMs: 1200
	},
	iron_axe: {
		id: 'iron_axe',
		name: 'Kapak Besi',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 3 },
			{ id: 'iron_ingot', qty: 2 }
		],
		outputs: [{ id: 'iron_axe', qty: 1, durability: 140 }],
		durationMs: 1400,
		unlock: { skill: { id: 'crafting', level: 2 } }
	},
	machete: {
		id: 'machete',
		name: 'Parang',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 2 },
			{ id: 'iron_ingot', qty: 2 },
			{ id: 'fiber', qty: 2 }
		],
		outputs: [{ id: 'machete', qty: 1, durability: 55 }],
		durationMs: 1200,
		unlock: { skill: { id: 'crafting', level: 2 } }
	},
	iron_sword: {
		id: 'iron_sword',
		name: 'Pedang Besi',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 2 },
			{ id: 'iron_ingot', qty: 4 }
		],
		outputs: [{ id: 'iron_sword', qty: 1, durability: 90 }],
		durationMs: 1600,
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	short_bow: {
		id: 'short_bow',
		name: 'Busur Pendek',
		station: 'workbench',
		ingredients: [
			{ id: 'hardwood', qty: 3 },
			{ id: 'fiber', qty: 4 }
		],
		outputs: [{ id: 'short_bow', qty: 1, durability: 40 }],
		durationMs: 1000,
		unlock: { skill: { id: 'crafting', level: 2 } }
	},
	iron_pickaxe: {
		id: 'iron_pickaxe',
		name: 'Beliung Besi',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 3 },
			{ id: 'iron_ingot', qty: 3 }
		],
		outputs: [{ id: 'iron_pickaxe', qty: 1, durability: 140 }],
		durationMs: 1400,
		unlock: { skill: { id: 'crafting', level: 3 } }
	},

	// ── Cooking station: complex food ───────────────────────────────────
	fish_stew: {
		id: 'fish_stew',
		name: 'Sup Ikan',
		station: 'cooking_station',
		ingredients: [
			{ id: 'fish', qty: 2 },
			{ id: 'herb', qty: 1 },
			{ id: 'water_flask', qty: 1 }
		],
		outputs: [{ id: 'fish_stew', qty: 1 }],
		durationMs: 1500
	},
	herbal_tonic: {
		id: 'herbal_tonic',
		name: 'Ramuan Herba',
		station: 'cooking_station',
		ingredients: [
			{ id: 'herb', qty: 3 },
			{ id: 'water_flask', qty: 1 }
		],
		outputs: [{ id: 'herbal_tonic', qty: 1 }],
		durationMs: 1200
	},

	// ── Boat workshop: end-game ─────────────────────────────────────────
	sail_cloth: {
		id: 'sail_cloth',
		name: 'Layar Kain',
		station: 'boat_workshop',
		ingredients: [
			{ id: 'fiber', qty: 12 },
			{ id: 'herb', qty: 4 }
		],
		outputs: [{ id: 'sail_cloth', qty: 1 }],
		durationMs: 2000
	},
	hull_plank: {
		id: 'hull_plank',
		name: 'Papan Lambung',
		station: 'boat_workshop',
		ingredients: [
			{ id: 'hardwood', qty: 6 },
			{ id: 'iron_ingot', qty: 2 }
		],
		outputs: [{ id: 'hull_plank', qty: 1 }],
		durationMs: 2200
	},
	sailing_boat: {
		id: 'sailing_boat',
		name: 'Kapal Layar',
		station: 'boat_workshop',
		ingredients: [
			{ id: 'sail_cloth', qty: 1 },
			{ id: 'hull_plank', qty: 2 },
			{ id: 'ancient_fragment', qty: 3 }
		],
		outputs: [{ id: 'sailing_boat', qty: 1 }],
		durationMs: 5000,
		unlock: { skill: { id: 'crafting', level: 5 } }
	},

	// ── Hand crafting: rope & basic cloth ───────────────────────────────
	rope: {
		id: 'rope',
		name: 'Tali',
		station: 'hand',
		ingredients: [{ id: 'fiber', qty: 3 }],
		outputs: [{ id: 'rope', qty: 1 }],
		durationMs: 400
	},
	cloth: {
		id: 'cloth',
		name: 'Kain',
		station: 'hand',
		ingredients: [
			{ id: 'fiber', qty: 4 },
			{ id: 'rope', qty: 1 }
		],
		outputs: [{ id: 'cloth', qty: 1 }],
		durationMs: 600,
		unlock: { skill: { id: 'crafting', level: 2 } }
	},
	bandage: {
		id: 'bandage',
		name: 'Perban',
		station: 'hand',
		ingredients: [{ id: 'cloth', qty: 1 }],
		outputs: [{ id: 'bandage', qty: 2 }],
		durationMs: 400
	},
	fiber_tunic: {
		id: 'fiber_tunic',
		name: 'Baju Serat',
		station: 'hand',
		ingredients: [
			{ id: 'fiber', qty: 8 },
			{ id: 'rope', qty: 2 }
		],
		outputs: [{ id: 'fiber_tunic', qty: 1, durability: 60 }],
		durationMs: 900,
		unlock: { skill: { id: 'crafting', level: 1 } }
	},

	// ── Campfire: charcoal & preservation ───────────────────────────────
	charcoal: {
		id: 'charcoal',
		name: 'Arang',
		station: 'campfire',
		ingredients: [{ id: 'wood', qty: 3 }],
		outputs: [{ id: 'charcoal', qty: 2 }],
		durationMs: 700
	},
	cooked_mushroom: {
		id: 'cooked_mushroom',
		name: 'Jamur Panggang',
		station: 'campfire',
		ingredients: [{ id: 'mushroom', qty: 2 }],
		outputs: [{ id: 'mushroom_soup', qty: 1 }],
		durationMs: 600
	},
	salted_fish: {
		id: 'salted_fish',
		name: 'Ikan Asin',
		station: 'campfire',
		ingredients: [
			{ id: 'fish', qty: 1 },
			{ id: 'salt', qty: 1 }
		],
		outputs: [{ id: 'salted_fish', qty: 1 }],
		durationMs: 800
	},

	// ── Workbench: smelting & tier-2 gear ───────────────────────────────
	steel_ingot: {
		id: 'steel_ingot',
		name: 'Batang Baja',
		station: 'workbench',
		ingredients: [
			{ id: 'iron_ingot', qty: 2 },
			{ id: 'charcoal', qty: 2 }
		],
		outputs: [{ id: 'steel_ingot', qty: 1 }],
		durationMs: 1800,
		unlock: { skill: { id: 'crafting', level: 4 } }
	},
	gold_ingot: {
		id: 'gold_ingot',
		name: 'Batang Emas',
		station: 'workbench',
		ingredients: [
			{ id: 'gold_ore', qty: 2 },
			{ id: 'charcoal', qty: 1 }
		],
		outputs: [{ id: 'gold_ingot', qty: 1 }],
		durationMs: 1800,
		unlock: { skill: { id: 'crafting', level: 4 } }
	},
	glass: {
		id: 'glass',
		name: 'Kaca',
		station: 'workbench',
		ingredients: [
			{ id: 'sand', qty: 3 },
			{ id: 'charcoal', qty: 1 }
		],
		outputs: [{ id: 'glass', qty: 1 }],
		durationMs: 1000,
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	leather: {
		id: 'leather',
		name: 'Kulit Samak',
		station: 'workbench',
		ingredients: [
			{ id: 'hide', qty: 2 },
			{ id: 'salt', qty: 1 }
		],
		outputs: [{ id: 'leather', qty: 1 }],
		durationMs: 1100,
		unlock: { skill: { id: 'crafting', level: 2 } }
	},
	iron_knife: {
		id: 'iron_knife',
		name: 'Pisau Besi',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 1 },
			{ id: 'iron_ingot', qty: 2 }
		],
		outputs: [{ id: 'iron_knife', qty: 1, durability: 120 }],
		durationMs: 1000,
		unlock: { skill: { id: 'crafting', level: 2 } }
	},
	iron_spear: {
		id: 'iron_spear',
		name: 'Tombak Besi',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 3 },
			{ id: 'iron_ingot', qty: 3 }
		],
		outputs: [{ id: 'iron_spear', qty: 1, durability: 100 }],
		durationMs: 1500,
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	hunting_bow: {
		id: 'hunting_bow',
		name: 'Busur Berburu',
		station: 'workbench',
		ingredients: [
			{ id: 'hardwood', qty: 4 },
			{ id: 'rope', qty: 3 },
			{ id: 'leather', qty: 1 }
		],
		outputs: [{ id: 'hunting_bow', qty: 1, durability: 80 }],
		durationMs: 1600,
		unlock: { skill: { id: 'crafting', level: 4 } }
	},
	steel_sword: {
		id: 'steel_sword',
		name: 'Pedang Baja',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 2 },
			{ id: 'steel_ingot', qty: 4 },
			{ id: 'leather', qty: 1 }
		],
		outputs: [{ id: 'steel_sword', qty: 1, durability: 150 }],
		durationMs: 2200,
		unlock: { skill: { id: 'crafting', level: 5 } }
	},
	leather_armor: {
		id: 'leather_armor',
		name: 'Baju Kulit',
		station: 'workbench',
		ingredients: [
			{ id: 'leather', qty: 4 },
			{ id: 'rope', qty: 2 }
		],
		outputs: [{ id: 'leather_armor', qty: 1, durability: 120 }],
		durationMs: 1400,
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	iron_armor: {
		id: 'iron_armor',
		name: 'Zirah Besi',
		station: 'workbench',
		ingredients: [
			{ id: 'iron_ingot', qty: 6 },
			{ id: 'leather', qty: 2 }
		],
		outputs: [{ id: 'iron_armor', qty: 1, durability: 200 }],
		durationMs: 2000,
		unlock: { skill: { id: 'crafting', level: 4 } }
	},
	croc_armor: {
		id: 'croc_armor',
		name: 'Zirah Buaya',
		station: 'workbench',
		ingredients: [
			{ id: 'croc_hide', qty: 5 },
			{ id: 'steel_ingot', qty: 2 }
		],
		outputs: [{ id: 'croc_armor', qty: 1, durability: 280 }],
		durationMs: 2600,
		unlock: { skill: { id: 'crafting', level: 5 } }
	},
	gold_hoe: {
		id: 'gold_hoe',
		name: 'Cangkul Emas',
		station: 'workbench',
		ingredients: [
			{ id: 'wood', qty: 3 },
			{ id: 'gold_ingot', qty: 3 }
		],
		outputs: [{ id: 'gold_hoe', qty: 1, durability: 200 }],
		durationMs: 1600,
		unlock: { skill: { id: 'crafting', level: 5 } }
	},

	// ── Cooking station: tier-2 food & medicine ─────────────────────────
	mushroom_soup: {
		id: 'mushroom_soup',
		name: 'Sup Jamur',
		station: 'cooking_station',
		ingredients: [
			{ id: 'mushroom', qty: 3 },
			{ id: 'water_flask', qty: 1 },
			{ id: 'salt', qty: 1 }
		],
		outputs: [{ id: 'mushroom_soup', qty: 1 }],
		durationMs: 1500
	},
	antidote: {
		id: 'antidote',
		name: 'Penawar Racun',
		station: 'cooking_station',
		ingredients: [
			{ id: 'venom_sac', qty: 1 },
			{ id: 'herb', qty: 2 },
			{ id: 'water_flask', qty: 1 }
		],
		outputs: [{ id: 'antidote', qty: 1 }],
		durationMs: 1600,
		unlock: { skill: { id: 'survival', level: 2 } }
	},

	// ── Ammunition & farming crafts ─────────────────────────────────────
	arrow: {
		id: 'arrow',
		name: 'Anak Panah',
		station: 'hand',
		ingredients: [
			{ id: 'wood', qty: 1 },
			{ id: 'feather', qty: 1 },
			{ id: 'stone', qty: 1 }
		],
		outputs: [{ id: 'arrow', qty: 5 }],
		durationMs: 400
	},
	fertilizer: {
		id: 'fertilizer',
		name: 'Pupuk',
		station: 'hand',
		ingredients: [
			{ id: 'mushroom', qty: 2 },
			{ id: 'sand', qty: 1 }
		],
		outputs: [{ id: 'fertilizer', qty: 2 }],
		durationMs: 500
	},
	seed: {
		id: 'seed',
		name: 'Benih',
		station: 'hand',
		ingredients: [
			{ id: 'berry', qty: 2 },
			{ id: 'fiber', qty: 1 }
		],
		outputs: [{ id: 'seed', qty: 2 }],
		durationMs: 400
	},
	lantern: {
		id: 'lantern',
		name: 'Lentera',
		station: 'workbench',
		ingredients: [
			{ id: 'glass', qty: 2 },
			{ id: 'iron_ingot', qty: 1 },
			{ id: 'charcoal', qty: 2 }
		],
		outputs: [{ id: 'lantern', qty: 1 }],
		durationMs: 1200,
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	pearl_necklace: {
		id: 'pearl_necklace',
		name: 'Kalung Mutiara',
		station: 'workbench',
		ingredients: [
			{ id: 'pearl', qty: 3 },
			{ id: 'rope', qty: 1 }
		],
		outputs: [{ id: 'pearl_necklace', qty: 1 }],
		durationMs: 1500,
		unlock: { skill: { id: 'crafting', level: 4 } }
	},

	// ── Chapter II: obsidian tier (requires the volcanic forge) ─────────
	obsidian_pickaxe: {
		id: 'obsidian_pickaxe',
		name: 'Beliung Obsidian',
		station: 'obsidian_forge',
		ingredients: [
			{ id: 'obsidian_shard', qty: 6 },
			{ id: 'iron_ingot', qty: 4 },
			{ id: 'rope', qty: 2 }
		],
		outputs: [{ id: 'obsidian_pickaxe', qty: 1, durability: 320 }],
		durationMs: 2600,
		unlock: { skill: { id: 'crafting', level: 6 } }
	},
	obsidian_blade: {
		id: 'obsidian_blade',
		name: 'Pedang Obsidian',
		station: 'obsidian_forge',
		ingredients: [
			{ id: 'obsidian_shard', qty: 8 },
			{ id: 'iron_ingot', qty: 6 },
			{ id: 'gold_ore', qty: 2 }
		],
		outputs: [{ id: 'obsidian_blade', qty: 1, durability: 140 }],
		durationMs: 3400,
		unlock: { skill: { id: 'crafting', level: 6 } }
	},
	obsidian_armor: {
		id: 'obsidian_armor',
		name: 'Zirah Obsidian',
		station: 'obsidian_forge',
		ingredients: [
			{ id: 'obsidian_shard', qty: 12 },
			{ id: 'croc_hide', qty: 4 },
			{ id: 'iron_ingot', qty: 8 }
		],
		outputs: [{ id: 'obsidian_armor', qty: 1 }],
		durationMs: 4200,
		unlock: { skill: { id: 'crafting', level: 7 } }
	},
	crater_ward: {
		id: 'crater_ward',
		name: 'Pusaka Kawah',
		station: 'obsidian_forge',
		ingredients: [
			{ id: 'gemstone', qty: 3 },
			{ id: 'obsidian_shard', qty: 10 },
			{ id: 'sulfur', qty: 8 },
			{ id: 'gold_ore', qty: 4 }
		],
		outputs: [{ id: 'crater_ward', qty: 1 }],
		durationMs: 6000,
		unlock: { skill: { id: 'crafting', level: 8 } }
	}
};

export const RECIPE_LIST: RecipeDefinition[] = Object.values(RECIPES);

export function getRecipe(id: string): RecipeDefinition | undefined {
	return RECIPES[id];
}
