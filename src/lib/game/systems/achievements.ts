import {
	ACHIEVEMENT_LIST,
	type AchievementCondition,
	type AchievementDefinition
} from '$data/achievements';

/**
 * Pure achievement engine (see §22 end-game loop).
 *
 * Achievement unlock state is a simple set of ids. Evaluation is done against a
 * snapshot so the engine never touches the live game state — fully testable and
 * deterministic. Unlocking is monotonic: an unlocked achievement never relocks.
 */

/** A snapshot of everything achievement evaluation needs. */
export interface ProgressSnapshot {
	/** Lifetime statistics, e.g. itemsGathered, itemsCrafted, playTimeMs. */
	stats: Record<string, number>;
	/** skill id -> current level. */
	skills: Record<string, number>;
	/** Number of biomes visited. */
	biomesVisited: number;
	/** Total biomes that exist in the world (for 'allBiomes'). */
	totalBiomes: number;
	/** Quests completed. */
	questsCompleted: number;
	/** Chapters completed (final quests turned in). */
	chaptersCompleted: number;
}

/** Whether a single condition is met by the snapshot. */
export function conditionMet(cond: AchievementCondition, snap: ProgressSnapshot): boolean {
	switch (cond.kind) {
		case 'stat':
			return (snap.stats[cond.target ?? ''] ?? 0) >= cond.count;
		case 'skill':
			return (snap.skills[cond.target ?? ''] ?? 0) >= cond.count;
		case 'quests':
			return snap.questsCompleted >= cond.count;
		case 'chapters':
			return snap.chaptersCompleted >= cond.count;
		case 'allBiomes':
			// "all" means the player has seen the whole map; also accept the
			// explicit count so a future partial set still works.
			return snap.totalBiomes > 0 && snap.biomesVisited >= Math.min(cond.count, snap.totalBiomes);
		default:
			return false;
	}
}

/** Whether every condition of an achievement is met. */
export function achievementMet(def: AchievementDefinition, snap: ProgressSnapshot): boolean {
	return def.conditions.every((c) => conditionMet(c, snap));
}

/** 0..1 completion of an achievement (fraction of conditions met). */
export function achievementProgress(def: AchievementDefinition, snap: ProgressSnapshot): number {
	if (def.conditions.length === 0) return 1;
	const met = def.conditions.filter((c) => conditionMet(c, snap)).length;
	return met / def.conditions.length;
}

export class Achievements {
	private unlocked = new Set<string>();

	constructor(unlocked: string[] = []) {
		for (const id of unlocked) this.unlocked.add(id);
	}

	has(id: string): boolean {
		return this.unlocked.has(id);
	}

	get count(): number {
		return this.unlocked.size;
	}

	get total(): number {
		return ACHIEVEMENT_LIST.length;
	}

	/**
	 * Evaluate every achievement against the snapshot. Returns the ids newly
	 * unlocked by this call (in definition order), so the caller can surface
	 * toasts + SFX exactly once. Idempotent: already-unlocked ids are skipped.
	 */
	evaluate(snap: ProgressSnapshot): string[] {
		const fresh: string[] = [];
		for (const def of ACHIEVEMENT_LIST) {
			if (this.unlocked.has(def.id)) continue;
			if (achievementMet(def, snap)) {
				this.unlocked.add(def.id);
				fresh.push(def.id);
			}
		}
		return fresh;
	}

	serialize(): string[] {
		return [...this.unlocked].sort();
	}
}
