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

/** Explicit overrides for the most common / most important item ids. */
const BY_ID: Record<string, ItemIcon> = {
	// Resources
	wood: { glyph: '🪵', tint: '#8a5a2b' },
	hardwood: { glyph: '🪵', tint: '#6b4420' },
	stone: { glyph: '🪨', tint: '#7d8a99' },
	fiber: { glyph: '🌾', tint: '#c9b56b' },
	clay: { glyph: '🧱', tint: '#b5734b' },
	iron_ore: { glyph: '⛏️', tint: '#8a93a6' },
	gold_ore: { glyph: '🪙', tint: '#f0b23c' },
	coal: { glyph: '🖤', tint: '#3a3a3a' },
	salt: { glyph: '🧂', tint: '#e8ecef' },
	gems: { glyph: '💎', tint: '#5ac8c8' },
	obsidian: { glyph: '🔮', tint: '#3a3348' },
	sulfur: { glyph: '🟡', tint: '#d9cf3a' },
	oyster: { glyph: '🦪', tint: '#c3cad3' },

	// Food & drink
	coconut: { glyph: '🥥', tint: '#8a5a33' },
	berry: { glyph: '🫐', tint: '#7a4a8a' },
	fish: { glyph: '🐟', tint: '#5aa2e0' },
	cooked_fish: { glyph: '🍣', tint: '#e8973c' },
	meat: { glyph: '🥩', tint: '#c95d5d' },
	cooked_meat: { glyph: '🍖', tint: '#a8552a' },
	egg: { glyph: '🥚', tint: '#e8dcc0' },
	mushroom: { glyph: '🍄', tint: '#c0392b' },
	fruit: { glyph: '🍎', tint: '#e0575b' },
	water: { glyph: '💧', tint: '#5aa2e0' },
	juice: { glyph: '🧃', tint: '#e8973c' },
	soup: { glyph: '🍲', tint: '#e8973c' },
	bread: { glyph: '🍞', tint: '#d8a24a' },
	herb: { glyph: '🌿', tint: '#6bbf5a' },
	seeds: { glyph: '🌱', tint: '#6bbf5a' },

	// Tools
	axe: { glyph: '🪓', tint: '#b0b6c2' },
	pickaxe: { glyph: '⛏️', tint: '#b0b6c2' },
	fishing_rod: { glyph: '🎣', tint: '#d8a24a' },
	knife: { glyph: '🔪', tint: '#c3cad3' },
	hoe: { glyph: '🪏', tint: '#8a5a2b' },
	torch: { glyph: '🔥', tint: '#ed8936' },
	lamp: { glyph: '🏮', tint: '#f6ad55' },
	watering_can: { glyph: '🪣', tint: '#5aa2e0' },

	// Weapons
	spear: { glyph: '🔱', tint: '#8a93a6' },
	bow: { glyph: '🏹', tint: '#8a5a2b' },
	arrow: { glyph: '🎯', tint: '#c9b56b' },
	machete: { glyph: '🗡️', tint: '#b0b6c2' },
	sword: { glyph: '⚔️', tint: '#c3cad3' },

	// Armor
	armor: { glyph: '🛡️', tint: '#8a93a6' },
	helmet: { glyph: '🪖', tint: '#8a93a6' },
	boots: { glyph: '🥾', tint: '#6b4420' },

	// Quest / special
	relic: { glyph: '🗿', tint: '#b07fe0' },
	artifact: { glyph: '🏺', tint: '#d69e2e' },
	boat_kit: { glyph: '⛵', tint: '#5aa2e0' },
	map: { glyph: '🗺️', tint: '#d8c48a' },
	key: { glyph: '🗝️', tint: '#f0b23c' },
	coin: { glyph: '🪙', tint: '#f0b23c' }
};

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
