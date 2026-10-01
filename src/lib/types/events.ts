import type { DayPhase, WeatherId } from './core';

/** Payload for PLAYER_STATS_CHANGED */
export interface PlayerStatsPayload {
	health: number;
	hunger: number;
	thirst: number;
	energy: number;
	maxHealth: number;
	maxHunger: number;
	maxThirst: number;
	maxEnergy: number;
}

export interface TimePayload {
	/** Normalised 0..1 fraction of the day (0 = midnight). */
	fraction: number;
	/** Whole in-game day counter starting at 1. */
	day: number;
	phase: DayPhase;
	/** Formatted "HH:MM". */
	clock: string;
}

export interface WeatherPayload {
	weather: WeatherId;
	/** 0..1 transition intensity for visuals. */
	intensity: number;
}

export interface InventoryChangedPayload {
	/** Bump counter used by the UI to know when to re-read the inventory. */
	revision: number;
}

export interface CraftingPayload {
	/** Revision bump so the crafting UI re-renders. */
	revision: number;
}

export interface StatsSnapshot {
	health: number;
	hunger: number;
	thirst: number;
	energy: number;
}

export interface QuestUpdatedPayload {
	questId: string;
	state: string;
}

export interface GameErrorPayload {
	category: 'GAME' | 'SAVE' | 'WORLD' | 'QUEST' | 'ASSET';
	message: string;
	recoverable: boolean;
}

export interface ProgressPayload {
	statistics: { itemsGathered: number; itemsCrafted: number; buildingsBuilt: number };
}

/**
 * Strongly-typed event map used by the bridge between Phaser and Svelte.
 * Adding an event here is the ONLY way new cross-layer communication is added.
 */
export interface GameEventMap {
	PLAYER_STATS_CHANGED: PlayerStatsPayload;
	INVENTORY_CHANGED: InventoryChangedPayload;
	CRAFTING_OPENED: void;
	CRAFTING_CLOSED: void;
	CRAFTING_CHANGED: CraftingPayload;
	QUEST_UPDATED: QuestUpdatedPayload;
	TIME_CHANGED: TimePayload;
	WEATHER_CHANGED: WeatherPayload;
	GAME_PAUSED: void;
	GAME_RESUMED: void;
	PLAYER_DIED: void;
	PLAYER_RESPAWNED: void;
	PLAYER_DAMAGED: { amount: number; health: number };
	COMBAT_HIT: { damage: number; isCritical: boolean };
	GAME_STATE_READY: void;
	SAVE_COMPLETED: void;
	GAME_ERROR: GameErrorPayload;
	PROGRESS_CHANGED: ProgressPayload;
	INTERACTION_PROMPT: { text: string | null };
	BIOME_CHANGED: { biome: string; name: string };
	HOTBAR_CHANGED: { activeSlot: number };
	BUILD_MODE_CHANGED: { definitionId: string | null };
	/** UI -> scene command to enter (definitionId) or leave (null) build mode. */
	BUILD_MODE_REQUEST: { definitionId: string | null };
	BUILD_PREVIEW: { valid: boolean | null; issues: string[] };
	BUILD_PLACED: { buildingId: string; definitionId: string };
	DIALOGUE_OPENED: { npcId: string; npcName: string; role: string; nodeId: string };
	DIALOGUE_CLOSED: void;
	NPC_NEARBY: { npcId: string | null; name: string | null };
	QUEST_UPDATED_UI: { revision: number };
	CHAPTER_COMPLETE: { chapter: number; title: string };
	SKILLS_CHANGED: { skills: { id: string; level: number; xp: number }[] };
	/** A skill reached a new level (id + new level) — drives SFX + UI toast. */
	SKILL_LEVEL_UP: { id: string; level: number };
	/** Achievements newly unlocked (ids) — drives toast + SFX + panel refresh. */
	ACHIEVEMENTS_UNLOCKED: { ids: string[] };
	/** A signal that may advance the first-session tutorial checklist. */
	TUTORIAL_SIGNAL: { signal: 'move' | 'gather' | 'craft' | 'build' | 'talk' };
	TOAST: { text: string; kind: 'info' | 'success' | 'warning' };
	/** Direct audio cue request (systems -> audio manager). */
	SFX: { id: string };
}

export type GameEventName = keyof GameEventMap;
