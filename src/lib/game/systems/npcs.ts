import { getNpc, npcPositionAt, NPCS, type NpcDefinition } from '$data/npcs';
import type { NpcSave } from '$types/save';
import type { Vec2 } from '$types/core';

/**
 * NPC runtime (see §21 / §36).
 *
 * Tracks met/relationship state and resolves each NPC's world position from its
 * schedule. Pure and deterministic.
 */

export interface NpcRuntime {
	id: string;
	/** Anchor position in px (deterministic from the world seed). */
	anchor: Vec2;
	met: boolean;
	relationship: number;
	lastDialogueId: string | null;
}

/** Relationship tiers used for dialogue/discount gating. */
export type RelationshipTier = 'stranger' | 'acquaintance' | 'friend' | 'ally';

export function relationshipTier(value: number): RelationshipTier {
	if (value >= 6) return 'ally';
	if (value >= 3) return 'friend';
	if (value >= 1) return 'acquaintance';
	return 'stranger';
}

export class NpcRegistry {
	private npcs = new Map<string, NpcRuntime>();

	constructor() {
		// Anchors are resolved later (they depend on world size, known at boot).
		for (const def of Object.values(NPCS)) {
			this.npcs.set(def.id, {
				id: def.id,
				anchor: { x: 0, y: 0 },
				met: false,
				relationship: 0,
				lastDialogueId: null
			});
		}
	}

	/** Set each NPC's anchor from the world size (fractions are -0.5..0.5 offsets). */
	placeAnchors(worldWidth: number, worldHeight: number): void {
		for (const def of Object.values(NPCS)) {
			const runtime = this.npcs.get(def.id);
			if (!runtime) continue;
			runtime.anchor = {
				x: worldWidth / 2 + def.anchor.x * worldWidth,
				y: worldHeight / 2 + def.anchor.y * worldHeight
			};
		}
	}

	get(id: string): NpcRuntime | undefined {
		return this.npcs.get(id);
	}

	all(): NpcRuntime[] {
		return [...this.npcs.values()];
	}

	/** Mark an NPC as met and record the last dialogue node id. */
	talk(id: string, dialogueId: string): void {
		const npc = this.npcs.get(id);
		if (!npc) return;
		npc.met = true;
		npc.lastDialogueId = dialogueId;
	}

	/** Add relationship points (clamped to >= 0). Returns the new value. */
	addRelationship(id: string, amount: number): number {
		const npc = this.npcs.get(id);
		if (!npc) return 0;
		npc.relationship = Math.max(0, npc.relationship + amount);
		return npc.relationship;
	}

	tier(id: string): RelationshipTier {
		return relationshipTier(this.npcs.get(id)?.relationship ?? 0);
	}

	/** Resolve an NPC's world position at the given in-game hour. */
	positionAt(id: string, hour: number): Vec2 {
		const def = getNpc(id);
		const runtime = this.npcs.get(id);
		if (!def || !runtime) return { x: 0, y: 0 };
		const pos = npcPositionAt(def, runtime.anchor, hour);
		return { x: pos.x, y: pos.y };
	}

	/** Activity label for an NPC at an hour (or null). */
	activityAt(id: string, hour: number): string | null {
		const def = getNpc(id);
		const runtime = this.npcs.get(id);
		if (!def || !runtime) return null;
		return npcPositionAt(def, runtime.anchor, hour).activity;
	}

	/** Nearest met/unmet NPC to a position within a range. */
	nearest(
		position: Vec2,
		range: number,
		hour: number
	): { def: NpcDefinition; runtime: NpcRuntime } | null {
		let best: { def: NpcDefinition; runtime: NpcRuntime } | null = null;
		let bestD = range;
		for (const def of Object.values(NPCS)) {
			const runtime = this.npcs.get(def.id);
			if (!runtime) continue;
			const pos = this.positionAt(def.id, hour);
			const d = Math.hypot(pos.x - position.x, pos.y - position.y);
			if (d < bestD) {
				bestD = d;
				best = { def, runtime };
			}
		}
		return best;
	}

	serialize(): NpcSave[] {
		return this.all().map((n) => ({
			id: n.id,
			met: n.met,
			relationship: n.relationship,
			lastDialogueId: n.lastDialogueId
		}));
	}

	deserialize(saves: NpcSave[]): void {
		for (const s of saves) {
			const npc = this.npcs.get(s.id);
			if (!npc) continue;
			npc.met = s.met;
			npc.relationship = s.relationship;
			npc.lastDialogueId = s.lastDialogueId;
		}
	}
}
