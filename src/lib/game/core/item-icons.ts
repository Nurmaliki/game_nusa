/**
 * Item icon resolution — a lightweight, dependency-free icon system.
 *
 * The inventory/hotbar used to render every item as a flat green square. This
 * maps an item (by explicit id, then by category/rarity/tag heuristic) to a
 * readable emoji glyph plus a warm background tint, so a bag full of loot reads
 * at a glance without bundling any image assets.
 *
 * Pure + engine-agnostic so it is unit-testable and reusable by any Svelte view.
 */

import type { ItemDefinition } from '$types/items';

export interface ItemIcon {
	/** The glyph to render (emoji or a single symbol). */
	glyph: string;
	/** Background tint for the icon tile (CSS colour). */
	tint: string;
}

/**
 * Explicit glyph per item id.
 *
 * IMPORTANT: every id in the catalogue (`$data/items`) should appear here. If an
 * id is missing, the icon falls back to a CATEGORY glyph, which frequently reads
 * as the wrong object (e.g. "Kapak Batu" showed a wrench because `tool` → 🔧).
 * `item-icons.spec.ts` asserts full coverage so a new item can never silently
 * regress to a mismatched icon.
 */
const BY_ID: Record<string, ItemIcon> = {
	// ── Common resources ────────────────────────────────────────────────
	wood: { glyph: '🪵', tint: '#8a5a2b' },
	stone: { glyph: '🪨', tint: '#7d8a99' },
	fiber: { glyph: '🌾', tint: '#c9b56b' },
	coconut: { glyph: '🥥', tint: '#8a5a33' },

	// ── Uncommon resources ──────────────────────────────────────────────
	hardwood: { glyph: '🪵', tint: '#6b4420' },
	clay: { glyph: '🧱', tint: '#b5734b' },
	herb: { glyph: '🌿', tint: '#6bbf5a' },
	shell: { glyph: '🐚', tint: '#e0c9a6' },

	// ── Rare resources ──────────────────────────────────────────────────
	iron_ore: { glyph: '⛏️', tint: '#8a93a6' },
	pearl: { glyph: '🫧', tint: '#dfe9f0' },

	// ── Food (raw) ──────────────────────────────────────────────────────
	meat: { glyph: '🥩', tint: '#c95d5d' },
	cooked_meat: { glyph: '🍖', tint: '#a8552a' },
	berry: { glyph: '🫐', tint: '#7a4a8a' },
	cooked_berry: { glyph: '🍒', tint: '#a8324a' },
	fish: { glyph: '🐟', tint: '#5aa2e0' },
	cooked_fish: { glyph: '🍣', tint: '#e8973c' },
	mushroom: { glyph: '🍄', tint: '#c0392b' },
	mushroom_soup: { glyph: '🍲', tint: '#c98a4a' },
	salted_fish: { glyph: '🐠', tint: '#7fb8d8' },
	fish_stew: { glyph: '🍲', tint: '#e8973c' },
	water_flask: { glyph: '💧', tint: '#5aa2e0' },

	// ── Volcanic resources ──────────────────────────────────────────────
	obsidian_shard: { glyph: '🔮', tint: '#3a3348' },
	sulfur: { glyph: '🟡', tint: '#d9cf3a' },
	gemstone: { glyph: '💎', tint: '#5ac8c8' },

	// ── Creature drops ──────────────────────────────────────────────────
	hide: { glyph: '🟫', tint: '#9c6b3f' },
	feather: { glyph: '🪶', tint: '#e8e2d0' },
	boar_tusk: { glyph: '🦷', tint: '#e6ddc8' },
	venom_sac: { glyph: '🧪', tint: '#6bbf5a' },
	tiger_fang: { glyph: '🦷', tint: '#d8c48a' },

	// ── Tools (with tier-aware tints) ───────────────────────────────────
	stone_axe: { glyph: '🪓', tint: '#8a93a6' },
	stone_pickaxe: { glyph: '⛏️', tint: '#8a93a6' },
	stone_knife: { glyph: '🔪', tint: '#8a93a6' },
	iron_axe: { glyph: '🪓', tint: '#c3cad3' },
	iron_pickaxe: { glyph: '⛏️', tint: '#c3cad3' },
	iron_knife: { glyph: '🔪', tint: '#c3cad3' },
	fishing_rod: { glyph: '🎣', tint: '#d8a24a' },
	gold_hoe: { glyph: '🪏', tint: '#f0b23c' },
	obsidian_pickaxe: { glyph: '⛏️', tint: '#5a4d78' },
	lantern: { glyph: '🏮', tint: '#f6ad55' },

	// ── Weapons (family glyphs) ─────────────────────────────────────────
	wooden_spear: { glyph: '🔱', tint: '#b98a4a' },
	iron_spear: { glyph: '🔱', tint: '#8a93a6' },
	short_bow: { glyph: '🏹', tint: '#8a5a2b' },
	hunting_bow: { glyph: '🏹', tint: '#6b4420' },
	machete: { glyph: '🗡️', tint: '#b0b6c2' },
	iron_sword: { glyph: '⚔️', tint: '#c3cad3' },
	steel_sword: { glyph: '⚔️', tint: '#dfe6ef' },
	obsidian_blade: { glyph: '⚔️', tint: '#5a4d78' },
	arrow: { glyph: '🎯', tint: '#c9b56b' },

	// ── Refined materials ───────────────────────────────────────────────
	iron_ingot: { glyph: '🧱', tint: '#8a93a6' },
	steel_ingot: { glyph: '🧱', tint: '#c3cad3' },
	gold_ingot: { glyph: '🧱', tint: '#f0b23c' },
	charcoal: { glyph: '🖤', tint: '#3a3a3a' },
	glass: { glyph: '🪟', tint: '#bfe3ea' },
	leather: { glyph: '🧶', tint: '#a9713e' },
	cloth: { glyph: '🧵', tint: '#c9b56b' },
	rope: { glyph: '🪢', tint: '#c9b56b' },
	sail_cloth: { glyph: '⛵', tint: '#e8e2d0' },
	hull_plank: { glyph: '🪵', tint: '#8a5a2b' },
	pearl_necklace: { glyph: '📿', tint: '#dfe9f0' },
	bandage: { glyph: '🩹', tint: '#e8e2d0' },
	antidote: { glyph: '🧪', tint: '#6bbf5a' },
	herbal_tonic: { glyph: '🧪', tint: '#6bbf5a' },
	seed: { glyph: '🌱', tint: '#6bbf5a' },
	fertilizer: { glyph: '💩', tint: '#8a6b3f' },

	// ── Raw resources (tier 2) ──────────────────────────────────────────
	bamboo: { glyph: '🎍', tint: '#8fbf4a' },
	salt: { glyph: '🧂', tint: '#e8ecef' },
	sand: { glyph: '🏖️', tint: '#e6d6a8' },
	gold_ore: { glyph: '🪙', tint: '#f0b23c' },
	croc_hide: { glyph: '🐊', tint: '#5b8a4a' },
	wolf_pelt: { glyph: '🐺', tint: '#9aa0a6' },

	// ── Armor ───────────────────────────────────────────────────────────
	fiber_tunic: { glyph: '🥋', tint: '#c9b56b' },
	leather_armor: { glyph: '🛡️', tint: '#a9713e' },
	iron_armor: { glyph: '🛡️', tint: '#8a93a6' },
	croc_armor: { glyph: '🛡️', tint: '#5b8a4a' },
	obsidian_armor: { glyph: '🛡️', tint: '#5a4d78' },

	// ── Quest / story ───────────────────────────────────────────────────
	ancient_fragment: { glyph: '🗿', tint: '#b07fe0' },
	crater_ward: { glyph: '🔮', tint: '#b07fe0' },
	sailing_boat: { glyph: '⛵', tint: '#5aa2e0' }
};

/** The set of ids with an explicit glyph (used by the coverage test). */
export const ITEM_ICON_IDS: ReadonlySet<string> = new Set(Object.keys(BY_ID));

/** Category defaults, used when there is no explicit id override. */
const BY_CATEGORY: Record<string, ItemIcon> = {
	resource: { glyph: '📦', tint: '#8a5a2b' },
	material: { glyph: '🧵', tint: '#a99d83' },
	food: { glyph: '🍲', tint: '#e8973c' },
	drink: { glyph: '🥤', tint: '#5aa2e0' },
	tool: { glyph: '🔧', tint: '#b0b6c2' },
	weapon: { glyph: '⚔️', tint: '#c3cad3' },
	armor: { glyph: '🛡️', tint: '#8a93a6' },
	consumable: { glyph: '🧪', tint: '#6bbf5a' },
	quest: { glyph: '⭐', tint: '#d69e2e' },
	building: { glyph: '🏠', tint: '#8a5a2b' },
	misc: { glyph: '❓', tint: '#a99d83' }
};

const RARITY_TINT: Record<string, string> = {
	common: '#b9ad92',
	uncommon: '#6bbf5a',
	rare: '#5aa2e0',
	special: '#b07fe0',
	quest: '#f0b23c'
};

/** Resolve an icon for an item definition (or id when the def is missing). */
export function itemIcon(def: ItemDefinition | undefined, id: string): ItemIcon {
	if (def && BY_ID[def.id]) return BY_ID[def.id];
	if (BY_ID[id]) return BY_ID[id];
	if (def && BY_CATEGORY[def.category]) return BY_CATEGORY[def.category];
	if (def && RARITY_TINT[def.rarity]) return { glyph: '✦', tint: RARITY_TINT[def.rarity] };
	return BY_CATEGORY.misc;
}

/** CSS border colour for an item's rarity frame. */
export function rarityBorder(rarity: string | undefined): string {
	return RARITY_TINT[rarity ?? 'common'] ?? RARITY_TINT.common;
}
