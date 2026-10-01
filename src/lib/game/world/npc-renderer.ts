import Phaser from 'phaser';
import { getNpc, NPC_LIST } from '$data/npcs';
import type { NpcRegistry } from '../systems/npcs';
import { SPRITE_KEYS } from '../core/sprites';
import { bobPhaseFor, idleBobOffset } from './animation';

/** Distinct cloth colours per NPC so each villager reads differently. */
const NPC_TINTS: Record<string, number> = {
	nelayan: 0x38b2ac,
	penjaga_hutan: 0xdd6b20,
	penambang: 0x718096,
	tokoh_lelluhur: 0x9f7aea
};

/**
 * Renders NPCs (see §21 / §36). Presentation only: positions come from the
 * registry's schedule resolution; this class just draws + tracks sprites.
 */
export class NpcRenderer {
	private scene: Phaser.Scene;
	private sprites = new Map<string, Phaser.GameObjects.Sprite>();
	/** Base (un-bobbed) world positions, so interaction checks stay stable. */
	private base = new Map<string, { x: number; y: number }>();
	private bobPhase = new Map<string, number>();

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	/** Create sprites for every NPC once anchors are known. */
	build(registry: NpcRegistry, hour: number): void {
		for (const def of NPC_LIST) {
			const pos = registry.positionAt(def.id, hour);
			const sprite = this.scene.add.sprite(pos.x, pos.y, SPRITE_KEYS.npc).setDepth(pos.y);
			sprite.setOrigin(0.5, 0.85);
			sprite.setTint(NPC_TINTS[def.id] ?? 0x63b3ed);
			this.sprites.set(def.id, sprite);
			this.base.set(def.id, { x: pos.x, y: pos.y });
			this.bobPhase.set(def.id, bobPhaseFor(def.id));
		}
	}

	/** Sync sprite positions with the schedule for the current hour. */
	sync(registry: NpcRegistry, hour: number, timeMs = 0): void {
		for (const [id, sprite] of this.sprites) {
			const pos = registry.positionAt(id, hour);
			this.base.set(id, { x: pos.x, y: pos.y });
			const bob = idleBobOffset(timeMs, this.bobPhase.get(id) ?? 0);
			sprite.setPosition(pos.x, pos.y + bob);
			sprite.setDepth(pos.y);
		}
	}

	/** World position of an NPC sprite (for interaction distance checks). */
	positionOf(id: string): { x: number; y: number } | null {
		return this.base.get(id) ?? null;
	}

	destroy(): void {
		for (const s of this.sprites.values()) s.destroy();
		this.sprites.clear();
		this.base.clear();
		this.bobPhase.clear();
	}
}

/** Exported for tests / scene wiring: does an NPC exist for this id? */
export function npcExists(id: string): boolean {
	return getNpc(id) !== undefined;
}
