import Phaser from 'phaser';
import { getCreature } from '$data/creatures';
import type { CreatureRuntime } from '../systems/combat';
import { creatureTexture, SPRITE_KEYS } from '../core/sprites';
import { bobPhaseFor, idleBobOffset } from './animation';
import { settingsStore } from '$stores/settings.svelte';

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
	/** Stable phase so each creature bobs out of step with the others. */
	bobPhase: number;
}

export class CreatureRenderer {
	private scene: Phaser.Scene;
	private map = new Map<CreatureRuntime, RenderedCreature>();

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	/** Sync sprites with the given runtime list (create/update/destroy). */
	sync(creatures: CreatureRuntime[], timeMs = 0): void {
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
				const tex = creatureTexture(c.definitionId);
				const key = this.scene.textures.exists(tex) ? tex : SPRITE_KEYS.monkey;
				const sprite = this.scene.add
					.sprite(c.position.x, c.position.y, key)
					.setOrigin(0.5, 0.8)
					.setDepth(c.position.y);
				// Subtle colour cue: predators get a faint red rim via tint, others natural.
				if (def.behaviour === 'predator') sprite.setTint(0xffd0d0);
				const barBg = this.scene.add
					.rectangle(c.position.x, c.position.y - 26, 30, 4, 0x000000, 0.6)
					.setDepth(c.position.y + 0.5);
				const barFill = this.scene.add
					.rectangle(c.position.x - 15, c.position.y - 26, 30, 4, 0x68d391, 1)
					.setOrigin(0, 0.5)
					.setDepth(c.position.y + 0.6);
				rendered = { sprite, barBg, barFill, bobPhase: bobPhaseFor(c.definitionId + c.position.x) };
				this.map.set(c, rendered);
			}
			// A gentle idle bob keeps wildlife from looking frozen. Suppressed when
			// the player prefers reduced motion.
			const bob = settingsStore.reducedMotion ? 0 : idleBobOffset(timeMs, rendered.bobPhase);
			rendered.sprite.setPosition(c.position.x, c.position.y + bob);
			rendered.sprite.setDepth(c.position.y);
			const ratio = c.maxHealth > 0 ? c.health / c.maxHealth : 0;
			rendered.barBg.setPosition(c.position.x, c.position.y - 26);
			rendered.barBg.setDepth(c.position.y + 0.5);
			rendered.barFill.setPosition(c.position.x - 15, c.position.y - 26);
			rendered.barFill.setDepth(c.position.y + 0.6);
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
