import type { ItemCategory, Rarity } from './core';

/** A stackable slot payload inside containers. */
export interface ItemStack {
	id: string;
	qty: number;
	/** Optional per-instance durability remaining (tools/weapons/armor). */
	durability?: number;
}

/** Static, data-driven definition. Never stored in saves. */
export interface ItemDefinition {
	id: string;
	name: string;
	description: string;
	category: ItemCategory;
	stackSize: number;
	weight: number;
	rarity: Rarity;
	/** Key referencing a generated placeholder texture (or atlas frame). */
	icon: string;
	sellValue: number;
	tags: string[];

	/** Consumable / food / drink effects. */
	effects?: ItemEffects;

	/** Tool-specific behaviour. */
	tool?: ToolDefinition;

	/** Weapon-specific behaviour. */
	weapon?: WeaponDefinition;

	/** Armor-specific behaviour. */
	armor?: ArmorDefinition;

	/** Quest items are flagged to prevent soft-locks (see §53). */
	questCritical?: boolean;
	/** Prevent dropping/discarding entirely. */
	noDrop?: boolean;
}

export interface ItemEffects {
	hunger?: number;
	thirst?: number;
	health?: number;
	energy?: number;
}

export type ToolKind = 'axe' | 'pickaxe' | 'fishing_rod' | 'knife' | 'hoe';

export interface ToolDefinition {
	kind: ToolKind;
	/** Multiplier applied to gathering yield / speed. */
	gatherPower: number;
	speed: number;
	durability: number;
	/** Resource node ids this tool is effective against. Empty = any. */
	resourceCompatibility: string[];
}

export type WeaponFamily = 'spear' | 'bow' | 'machete' | 'sword';

export interface WeaponDefinition {
	family: WeaponFamily;
	damage: number;
	attackSpeed: number;
	range: number;
	energyCost: number;
	criticalChance: number;
	durabilityCost: number;
	/** Total durability of the weapon when new. */
	durability: number;
	ranged?: boolean;
}

export interface ArmorDefinition {
	damageReduction: number;
	durability: number;
}
