import Phaser from 'phaser';
import { getCreature } from '$data/creatures';
import type { CreatureRuntime } from '../systems/combat';

/**
 * Renders the live wildlife (see §19 / §34).
 *
 * Owns one sprite + health bar per creature and keeps them in sync with the
 * pure {@link CreatureRuntime} list each frame. Presentation only — no rules.
 */
interface RenderedCreature {
	sprite: Phaser.GameObjects.Sprite;
	barBg: Phaser.GameObjects.Rectangle;
	barFill: Phaser.GameObjects.Rectangle;
}

export class CreatureRenderer {
	private scene: Phaser.Scene;
	private map = new Map<CreatureRuntime, RenderedCreature>();

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	/** Sync sprites with the given runtime list (create/update/destroy). */
	sync(creatures: CreatureRuntime[]): void {
		const live = new Set<CreatureRuntime>(creatures);
		// Remove sprites whose runtime is gone (O(n) via the live set).
		for (const [runtime, rendered] of this.map) {
			if (!live.has(runtime)) {
				rendered.sprite.destroy();
				rendered.barBg.destroy();
				rendered.barFill.destroy();
				this.map.delete(runtime);
			}
		}
		for (const c of creatures) {
			let rendered = this.map.get(c);
			if (!rendered) {
				const def = getCreature(c.definitionId);
				if (!def) continue;
				const sprite = this.scene.add.sprite(c.position.x, c.position.y, def.texture).setDepth(40);
				sprite.setTint(def.behaviour === 'predator' ? 0xff6b6b : 0xffffff);
				const barBg = this.scene.add
					.rectangle(c.position.x, c.position.y - 22, 30, 4, 0x000000, 0.6)
					.setDepth(41);
				const barFill = this.scene.add
					.rectangle(c.position.x - 15, c.position.y - 22, 30, 4, 0x68d391, 1)
					.setOrigin(0, 0.5)
					.setDepth(42);
				rendered = { sprite, barBg, barFill };
				this.map.set(c, rendered);
			}
			rendered.sprite.setPosition(c.position.x, c.position.y);
			const ratio = c.maxHealth > 0 ? c.health / c.maxHealth : 0;
			rendered.barBg.setPosition(c.position.x, c.position.y - 22);
			rendered.barFill.setPosition(c.position.x - 15, c.position.y - 22);
			rendered.barFill.width = 30 * Math.max(0, Math.min(1, ratio));
			rendered.barBg.setVisible(ratio < 1);
			rendered.barFill.setVisible(ratio < 1);
		}
	}

	destroy(): void {
		for (const [, r] of this.map) {
			r.sprite.destroy();
			r.barBg.destroy();
			r.barFill.destroy();
		}
		this.map.clear();
	}
}
