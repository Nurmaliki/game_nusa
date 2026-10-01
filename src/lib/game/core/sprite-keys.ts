/**
 * Sprite key registry + pure content→key resolvers (see §35).
 *
 * Deliberately free of any Phaser import so the mapping can be unit-tested in
 * the engine-free `node` test environment. `sprites.ts` re-exports these and
 * owns the actual painting.
 */

export const SPRITE_KEYS = {
	player: 'sprite_player',
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
	tileRock: 'tile_rock'
} as const;

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
