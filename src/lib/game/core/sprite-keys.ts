/**
 * Sprite key registry + pure content→key resolvers (see §35).
 *
 * Deliberately free of any Phaser import so the mapping can be unit-tested in
 * the engine-free `node` test environment. `sprites.ts` re-exports these and
 * owns the actual painting.
 */

export const SPRITE_KEYS = {
	player: 'sprite_player',
	/** Directional player art: side is drawn right-facing and mirrored for left. */
	playerDown: 'sprite_player_down',
	playerUp: 'sprite_player_up',
	playerSide: 'sprite_player_side',
	tree: 'sprite_tree',
	pine: 'sprite_pine',
	palm: 'sprite_palm',
	bamboo: 'sprite_bamboo',
	rock: 'sprite_rock',
	ironVein: 'sprite_iron_vein',
	goldVein: 'sprite_gold_vein',
	bush: 'sprite_bush',
	berryBush: 'sprite_berry_bush',
	herb: 'sprite_herb',
	mushroom: 'sprite_mushroom',
	rarePlant: 'sprite_rare_plant',
	shellPile: 'sprite_shell_pile',
	clayMound: 'sprite_clay_mound',
	saltFlat: 'sprite_salt_flat',
	sandBank: 'sprite_sand_bank',
	ruinCache: 'sprite_ruin_cache',
	oysterBed: 'sprite_oyster_bed',
	obsidianRock: 'sprite_obsidian_rock',
	sulfurVent: 'sprite_sulfur_vent',
	gemVein: 'sprite_gem_vein',
	fish: 'sprite_fish',
	crab: 'sprite_crab',
	seagull: 'sprite_seagull',
	boar: 'sprite_boar',
	monkey: 'sprite_monkey',
	snake: 'sprite_snake',
	hawk: 'sprite_hawk',
	tiger: 'sprite_tiger',
	crocodile: 'sprite_crocodile',
	wolf: 'sprite_wolf',
	komodo: 'sprite_komodo',
	npc: 'sprite_npc',
	tileGrass: 'tile_grass',
	tileSand: 'tile_sand',
	tileRock: 'tile_rock',
	// Structures (placed buildings). A distinct key per visual family.
	campfire: 'sprite_campfire',
	shelter: 'sprite_shelter',
	bed: 'sprite_bed',
	storage: 'sprite_storage',
	workbench: 'sprite_workbench',
	cookingStation: 'sprite_cooking_station',
	waterCollector: 'sprite_water_collector',
	farmPlot: 'sprite_farm_plot',
	fence: 'sprite_fence',
	torch: 'sprite_torch',
	house: 'sprite_house',
	dock: 'sprite_dock',
	boatWorkshop: 'sprite_boat_workshop',
	dryingRack: 'sprite_drying_rack',
	watchtower: 'sprite_watchtower',
	lamp: 'sprite_lamp',
	well: 'sprite_well',
	forge: 'sprite_forge',
	/** Shown while a structure is still under construction. */
	scaffold: 'sprite_scaffold'
} as const;

/**
 * Map a facing direction to the player's directional texture key + whether to
 * mirror it. Pure (no engine) so it is unit-testable. `side` art is drawn
 * right-facing, so leftward movement mirrors it.
 */
export function playerFacingTexture(facing: { x: number; y: number }): {
	key: string;
	flipX: boolean;
} {
	if (Math.abs(facing.x) > Math.abs(facing.y)) {
		return { key: SPRITE_KEYS.playerSide, flipX: facing.x < 0 };
	}
	if (facing.y < 0) return { key: SPRITE_KEYS.playerUp, flipX: false };
	return { key: SPRITE_KEYS.playerDown, flipX: false };
}

/** Biome-agnostic key for a resource node type (falls back to a generic). */
export function resourceTexture(nodeTypeId: string): string {
	switch (nodeTypeId) {
		case 'tree':
			return SPRITE_KEYS.tree;
		case 'hardwood_tree':
			return SPRITE_KEYS.pine;
		case 'palm':
			return SPRITE_KEYS.palm;
		case 'bamboo_grove':
			return SPRITE_KEYS.bamboo;
		case 'rock':
			return SPRITE_KEYS.rock;
		case 'clay_mound':
			return SPRITE_KEYS.clayMound;
		case 'iron_vein':
			return SPRITE_KEYS.ironVein;
		case 'gold_vein':
			return SPRITE_KEYS.goldVein;
		case 'bush':
			return SPRITE_KEYS.berryBush;
		case 'herb_patch':
			return SPRITE_KEYS.herb;
		case 'mushroom_patch':
			return SPRITE_KEYS.mushroom;
		case 'rare_plant':
			return SPRITE_KEYS.rarePlant;
		case 'shell_pile':
			return SPRITE_KEYS.shellPile;
		case 'oyster_bed':
			return SPRITE_KEYS.oysterBed;
		case 'salt_flat':
			return SPRITE_KEYS.saltFlat;
		case 'sand_bank':
			return SPRITE_KEYS.sandBank;
		case 'ruin_cache':
			return SPRITE_KEYS.ruinCache;
		case 'fish_shoal':
			return SPRITE_KEYS.fish;
		case 'obsidian':
			return SPRITE_KEYS.obsidianRock;
		case 'sulfur_vent':
			return SPRITE_KEYS.sulfurVent;
		case 'rock_gem':
			return SPRITE_KEYS.gemVein;
		default:
			return SPRITE_KEYS.bush;
	}
}

/** Key for a creature species id (falls back to a generic critter). */
export function creatureTexture(creatureId: string): string {
	switch (creatureId) {
		case 'crab':
			return SPRITE_KEYS.crab;
		case 'seagull':
			return SPRITE_KEYS.seagull;
		case 'boar':
			return SPRITE_KEYS.boar;
		case 'monkey':
			return SPRITE_KEYS.monkey;
		case 'snake':
			return SPRITE_KEYS.snake;
		case 'hawk':
			return SPRITE_KEYS.hawk;
		case 'tiger':
			return SPRITE_KEYS.tiger;
		case 'crocodile':
			return SPRITE_KEYS.crocodile;
		case 'wolf':
			return SPRITE_KEYS.wolf;
		case 'komodo':
			return SPRITE_KEYS.komodo;
		default:
			return SPRITE_KEYS.monkey;
	}
}

/**
 * Key for a placed building definition id. Structures render as a distinct
 * sprite once built; the finished texture is chosen here so swapping real art
 * is a one-line change per building. Falls back to the generic storage sprite
 * so an unmapped building still renders as *something* rather than nothing.
 */
export function buildingTexture(definitionId: string): string {
	switch (definitionId) {
		case 'campfire':
			return SPRITE_KEYS.campfire;
		case 'shelter':
			return SPRITE_KEYS.shelter;
		case 'bed':
			return SPRITE_KEYS.bed;
		case 'storage':
		case 'storage_chest':
			return SPRITE_KEYS.storage;
		case 'workbench':
			return SPRITE_KEYS.workbench;
		case 'cooking_station':
			return SPRITE_KEYS.cookingStation;
		case 'water_collector':
		case 'rain_catcher':
			return SPRITE_KEYS.waterCollector;
		case 'farm_plot':
			return SPRITE_KEYS.farmPlot;
		case 'fence':
			return SPRITE_KEYS.fence;
		case 'torch':
			return SPRITE_KEYS.torch;
		case 'house':
			return SPRITE_KEYS.house;
		case 'fishing_dock':
		case 'dock':
			return SPRITE_KEYS.dock;
		case 'boat_workshop':
			return SPRITE_KEYS.boatWorkshop;
		case 'drying_rack':
			return SPRITE_KEYS.dryingRack;
		case 'watchtower':
			return SPRITE_KEYS.watchtower;
		case 'garden_lamp':
			return SPRITE_KEYS.lamp;
		case 'well':
			return SPRITE_KEYS.well;
		case 'obsidian_forge':
			return SPRITE_KEYS.forge;
		default:
			return SPRITE_KEYS.storage;
	}
}
