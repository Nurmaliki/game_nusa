import type { BiomeId, ItemCategory, Rarity, WeatherId } from './core';
import type { ItemStack } from './items';

/**
 * Save DTOs. These are the ONLY shapes persisted to IndexedDB.
 * Never store class instances or functions here.
 */

export const CURRENT_SCHEMA_VERSION = 2 as const;

export interface PlayerSave {
	position: { x: number; y: number };
	biome: BiomeId;
	health: number;
	hunger: number;
	thirst: number;
	energy: number;
	/** Last valid respawn anchor (bed/shelter). */
	respawnPoint: { x: number; y: number } | null;
	isDead: boolean;
}

export interface InventorySave {
	/** Fixed-length slot array; null = empty slot. */
	slots: (ItemStack | null)[];
	capacity: number;
	hotbarSize: number;
}

export interface EquipmentSave {
	hotbar: (ItemStack | null)[];
	weapon: ItemStack | null;
	armor: ItemStack | null;
}

export interface WorldSave {
	seed: number;
	/** Chunk-local changes keyed by chunk id (e.g. "3,-2"). */
	chunkModifications: Record<string, ChunkModification[]>;
	/** Harvested persistent resource nodes. */
	harvestedNodes: string[];
	/** Recoverable backpacks dropped on death. */
	backpacks?: BackpackSave[];
	/** Per-item craft counts (quest objectives). */
	craftedCounts?: Record<string, number>;
	/** Per-creature defeat counts (quest objectives). */
	defeatedCounts?: Record<string, number>;
	/** Biomes visited by the player. */
	visitedBiomes?: string[];
	/** NPCs the player has talked to. */
	talkedNpcs?: string[];
}

export interface BackpackSave {
	id: string;
	position: { x: number; y: number };
	contents: ItemStack[];
}

export interface ChunkModification {
	type: 'node_removed' | 'container_opened' | 'interaction';
	targetId: string;
}

export interface BuildingSave {
	id: string;
	definitionId: string;
	position: { x: number; y: number };
	rotation: number;
	/** Generic per-building state (e.g. storage contents, fire fuel). */
	state: Record<string, unknown>;
	/** Total build time in ms (0/absent = instant). */
	buildMs?: number;
	/** Elapsed build time in ms; complete when >= buildMs. */
	buildElapsedMs?: number;
}

export interface QuestSave {
	id: string;
	state: 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETABLE' | 'COMPLETED';
	objectives: { id: string; current: number; complete: boolean }[];
}

export interface NpcSave {
	id: string;
	met: boolean;
	relationship: number;
	lastDialogueId: string | null;
}

export interface SkillSave {
	id: string;
	level: number;
	xp: number;
}

export interface StatisticsSave {
	itemsGathered: number;
	itemsCrafted: number;
	buildingsBuilt: number;
	enemiesDefeated: number;
	questsCompleted: number;
	/** Player deaths (added in schema v2; defaults to 0 for older saves). */
	deaths?: number;
	playTimeMs: number;
}

export interface SettingsSave {
	masterVolume: number;
	musicVolume: number;
	sfxVolume: number;
	uiScale: number;
	reducedMotion: boolean;
	screenShake: boolean;
	damageFlash: boolean;
	[key: string]: number | boolean;
}

export interface GameSave {
	schemaVersion: number;
	gameVersion: string;
	saveId: string;
	worldSeed: number;
	createdAt: number;
	updatedAt: number;
	player: PlayerSave;
	inventory: InventorySave;
	equipment: EquipmentSave;
	world: WorldSave;
	buildings: BuildingSave[];
	quests: QuestSave[];
	npcs: NpcSave[];
	skills: SkillSave[];
	statistics: StatisticsSave;
	settings: SettingsSave;
	/** Simulation clock in ms since game start. */
	gameTimeMs: number;
	weather: WeatherId;
	chapterComplete: boolean;
	/** Ids of unlocked achievements (added post-v2; optional for old saves). */
	achievements?: string[];
}

export interface SaveSlotMeta {
	saveId: string;
	gameVersion: string;
	schemaVersion: number;
	createdAt: number;
	updatedAt: number;
	playTimeMs: number;
	/** Human readable progress hint for the save/load menu. */
	summary: string;
}

/** Re-exported convenience aliases used by content definitions. */
export type { ItemCategory, Rarity };
