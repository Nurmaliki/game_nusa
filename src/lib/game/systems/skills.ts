import { BALANCE } from '../config/balance';
import type { SkillSave } from '$types/save';
import { err, ok, type Result } from '$types/core';

/**
 * Skills & XP system (see §16 / §32).
 *
 * Pure and deterministic: XP is awarded by discrete gameplay events, levels are
 * derived from XP. Skills gate recipes and buildings. No Phaser/Svelte imports.
 */

export type SkillId = 'gathering' | 'crafting' | 'survival' | 'combat' | 'fishing';

export const SKILL_IDS: SkillId[] = ['gathering', 'crafting', 'survival', 'combat', 'fishing'];

/** XP required to reach `level` (1-based). level 1 = 0 xp. */
export function xpForLevel(level: number): number {
	if (level <= 1) return 0;
	return Math.round(BALANCE.xp.base * Math.pow(level - 1, BALANCE.xp.exponent));
}

/** Level derived from accumulated xp, capped at maxLevel. */
export function levelForXp(xp: number): number {
	let level = 1;
	while (level < BALANCE.xp.maxLevel && xp >= xpForLevel(level + 1)) level++;
	return level;
}

export interface SkillState {
	id: SkillId;
	xp: number;
}

export class Skills {
	private readonly map = new Map<SkillId, number>();

	constructor() {
		for (const id of SKILL_IDS) this.map.set(id, 0);
	}

	xp(id: SkillId): number {
		return this.map.get(id) ?? 0;
	}

	level(id: SkillId): number {
		return levelForXp(this.xp(id));
	}

	/** Progress in [0,1) toward the next level. */
	progress(id: SkillId): number {
		const level = this.level(id);
		if (level >= BALANCE.xp.maxLevel) return 1;
		const from = xpForLevel(level);
		const to = xpForLevel(level + 1);
		return (this.xp(id) - from) / (to - from);
	}

	/** Award xp; returns the levels gained (0 or 1 typical). */
	award(id: SkillId, amount: number): number {
		if (amount <= 0) return 0;
		const before = this.level(id);
		this.map.set(id, Math.min(this.xp(id) + amount, xpForLevel(BALANCE.xp.maxLevel)));
		return this.level(id) - before;
	}

	meets(id: string, level: number): boolean {
		if (!SKILL_IDS.includes(id as SkillId)) return false;
		return this.level(id as SkillId) >= level;
	}

	/** All skill levels as a plain record (for placement/recipe gating). */
	toRecord(): Record<string, number> {
		const out: Record<string, number> = {};
		for (const id of SKILL_IDS) out[id] = this.level(id);
		return out;
	}

	serialize(): SkillSave[] {
		return SKILL_IDS.map((id) => ({ id, xp: this.xp(id), level: this.level(id) }));
	}

	deserialize(saves: SkillSave[]): void {
		for (const s of saves) {
			if (SKILL_IDS.includes(s.id as SkillId)) this.map.set(s.id as SkillId, s.xp);
		}
	}

	/** Validate that the player satisfies an unlock/skill requirement. */
	static meets(levels: Record<string, number>, req?: { id: string; level: number }): boolean {
		if (!req) return true;
		return (levels[req.id] ?? 0) >= req.level;
	}
}

/** Convenience result wrapper for requirement checks with a reason. */
export function checkRequirement(
	levels: Record<string, number>,
	req?: { id: string; level: number }
): Result<void, 'skill_locked'> {
	return Skills.meets(levels, req) ? ok(undefined) : err('skill_locked');
}
