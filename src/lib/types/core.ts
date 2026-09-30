/**
 * Core primitive types shared across the game.
 * These types are intentionally engine-agnostic: no Phaser or Svelte imports here.
 */

export interface Vec2 {
	x: number;
	y: number;
}

/** A grid coordinate (integer) used for chunk addressing. */
export interface GridCoord {
	cx: number;
	cy: number;
}

export type GamePhase = 'boot' | 'menu' | 'playing' | 'paused' | 'dead' | 'ending';

export type BiomeId = 'tropical_coast' | 'rainforest' | 'highlands';

export type WeatherId = 'clear' | 'rain' | 'storm' | 'fog' | 'wind';

/** Time of day phases, driven by the internal simulation clock. */
export type DayPhase = 'midnight' | 'dawn' | 'sunrise' | 'morning' | 'midday' | 'sunset' | 'night';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'special' | 'quest';

export type ItemCategory =
	'resource' | 'food' | 'drink' | 'tool' | 'weapon' | 'armor' | 'quest' | 'material' | 'consumable';

/** Stable instance identifier for a placed entity / stack. */
export type EntityId = string;

/** Discriminated union result used for fallible domain operations. */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}

export function err<E = string>(error: E): Result<never, E> {
	return { ok: false, error };
}
