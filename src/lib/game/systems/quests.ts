import { QUESTS, QUEST_LIST, getQuest, type QuestDefinition } from '$data/quests';
import type { ItemStack } from '$types/items';
import { err, ok, type Result } from '$types/core';

/**
 * Pure quest engine (see §22 / §37).
 *
 * Quests progress through explicit states. Objective evaluation is done against
 * a snapshot of the world (counts of gathered/crafted/built/killed, flags) so
 * the engine never touches the live game state directly — keeping it testable.
 *
 *  LOCKED -> AVAILABLE -> ACTIVE -> COMPLETABLE -> COMPLETED
 */

export type QuestState = 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETABLE' | 'COMPLETED';

export interface ObjectiveProgress {
	id: string;
	current: number;
	complete: boolean;
}

export interface QuestProgress {
	id: string;
	state: QuestState;
	objectives: ObjectiveProgress[];
}

/** A snapshot of everything objective evaluation needs. */
export interface WorldSnapshot {
	/** item id -> total count in the inventory. */
	counts: Record<string, number>;
	/** item id -> total crafted during this playthrough (statistics or tracked). */
	crafted: Record<string, number>;
	/** building definition id -> count placed. */
	built: Record<string, number>;
	/** creature id -> count defeated. */
	defeated: Record<string, number>;
	/** biome ids the player has visited. */
	visited: Set<string>;
	/** npc ids the player has talked to at least once. */
	talked: Set<string>;
	/** custom boolean flags. */
	flags: Set<string>;
}

export function emptySnapshot(): WorldSnapshot {
	return {
		counts: {},
		crafted: {},
		built: {},
		defeated: {},
		visited: new Set(),
		talked: new Set(),
		flags: new Set()
	};
}

/** Current progress value for an objective given a snapshot. */
export function objectiveValue(
	def: QuestDefinition,
	objectiveId: string,
	snapshot: WorldSnapshot
): number {
	const objective = def.objectives.find((o) => o.id === objectiveId);
	if (!objective) return 0;
	switch (objective.kind) {
		case 'gather':
			return snapshot.counts[objective.target] ?? 0;
		case 'craft':
			return snapshot.crafted[objective.target] ?? 0;
		case 'build':
			return snapshot.built[objective.target] ?? 0;
		case 'defeat':
			return snapshot.defeated[objective.target] ?? 0;
		case 'reach':
			return snapshot.visited.has(objective.target) ? 1 : 0;
		case 'talk':
			return snapshot.talked.has(objective.target) ? 1 : 0;
		case 'flag':
			return snapshot.flags.has(objective.target) ? 1 : 0;
	}
}

/** Build a fresh progress record for a quest in its initial state. */
export function initProgress(def: QuestDefinition, state: QuestState = 'LOCKED'): QuestProgress {
	return {
		id: def.id,
		state,
		objectives: def.objectives.map((o) => ({ id: o.id, current: 0, complete: false }))
	};
}

/** Re-evaluate a quest's objectives against a snapshot, updating the state. */
export function evaluateQuest(progress: QuestProgress, snapshot: WorldSnapshot): QuestProgress {
	const def = getQuest(progress.id);
	if (!def) return progress;
	if (progress.state === 'COMPLETED' || progress.state === 'LOCKED') return progress;

	const next: QuestProgress = {
		...progress,
		objectives: progress.objectives.map((o) => {
			const value = objectiveValue(def, o.id, snapshot);
			const current = Math.min(value, def.objectives.find((d) => d.id === o.id)!.count);
			return {
				...o,
				current,
				complete: current >= def.objectives.find((d) => d.id === o.id)!.count
			};
		})
	};
	const allComplete = next.objectives.every((o) => o.complete);
	if (allComplete && next.state === 'ACTIVE') next.state = 'COMPLETABLE';
	if (!allComplete && next.state === 'COMPLETABLE') next.state = 'ACTIVE';
	return next;
}

/** Item stacks consumed when a gather objective with `consume` completes. */
export function consumedItems(def: QuestDefinition): ItemStack[] {
	return def.objectives
		.filter((o) => o.consume && (o.kind === 'gather' || o.kind === 'craft'))
		.map((o) => ({ id: o.target, qty: o.count }));
}

export class QuestLog {
	private progress = new Map<string, QuestProgress>();

	constructor() {
		// Everything starts LOCKED; `refreshAvailability` unlocks the roots.
		for (const def of QUEST_LIST) this.progress.set(def.id, initProgress(def, 'LOCKED'));
	}

	get(id: string): QuestProgress | undefined {
		return this.progress.get(id);
	}

	all(): QuestProgress[] {
		return [...this.progress.values()];
	}

	state(id: string): QuestState | undefined {
		return this.progress.get(id)?.state;
	}

	isCompleted(id: string): boolean {
		return this.progress.get(id)?.state === 'COMPLETED';
	}

	activeQuests(): QuestProgress[] {
		return this.all().filter((p) => p.state === 'ACTIVE' || p.state === 'COMPLETABLE');
	}

	/**
	 * Promote LOCKED quests to AVAILABLE once their prerequisites are completed.
	 * Returns the ids that became available this call.
	 */
	refreshAvailability(): string[] {
		const unlocked: string[] = [];
		for (const def of QUEST_LIST) {
			const p = this.progress.get(def.id)!;
			if (p.state !== 'LOCKED') continue;
			const ready = def.prerequisites.every((pre) => this.isCompleted(pre));
			if (ready) {
				p.state = 'AVAILABLE';
				unlocked.push(def.id);
			}
		}
		return unlocked;
	}

	/** Accept a quest (AVAILABLE -> ACTIVE). */
	accept(id: string): Result<QuestProgress, 'not_available' | 'unknown'> {
		const p = this.progress.get(id);
		if (!p) return err('unknown');
		if (p.state !== 'AVAILABLE') return err('not_available');
		p.state = 'ACTIVE';
		return ok(p);
	}

	/** Re-evaluate all active quests against a snapshot. */
	update(snapshot: WorldSnapshot): void {
		for (const [id, p] of this.progress) {
			if (p.state === 'ACTIVE' || p.state === 'COMPLETABLE') {
				this.progress.set(id, evaluateQuest(p, snapshot));
			}
		}
	}

	/**
	 * Turn in a COMPLETABLE quest -> COMPLETED. Returns the definition so the
	 * caller can grant rewards. Fails if not completable.
	 */
	turnIn(id: string): Result<QuestDefinition, 'not_completable' | 'unknown'> {
		const p = this.progress.get(id);
		if (!p) return err('unknown');
		if (p.state !== 'COMPLETABLE') return err('not_completable');
		const def = getQuest(id);
		if (!def) return err('unknown');
		p.state = 'COMPLETED';
		this.refreshAvailability();
		return ok(def);
	}

	serialize(): { id: string; state: QuestState; objectives: ObjectiveProgress[] }[] {
		return this.all().map((p) => ({
			id: p.id,
			state: p.state,
			objectives: p.objectives.map((o) => ({ ...o }))
		}));
	}

	deserialize(saves: { id: string; state: string; objectives: ObjectiveProgress[] }[]): void {
		for (const s of saves) {
			const existing = this.progress.get(s.id);
			if (!existing) continue;
			existing.state = s.state as QuestState;
			existing.objectives = s.objectives.map((o) => ({ ...o }));
		}
	}
}

/** Convenience: objective ids a quest owns. */
export function questObjectiveIds(id: string): string[] {
	return QUESTS[id]?.objectives.map((o) => o.id) ?? [];
}
