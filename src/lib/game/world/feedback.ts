import Phaser from 'phaser';
import { BALANCE } from '../config/balance';

/**
 * Presentation-only "game feel" effects (see §35 / §38).
 *
 * Owns the short-lived floating numbers and impact particles that make actions
 * feel responsive. Everything here is cosmetic: no gameplay state is read or
 * written, and all objects clean themselves up. Kept out of the pure game core
 * so the domain logic stays engine-free.
 */
export class Feedback {
	private scene: Phaser.Scene;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	/** Floating number that rises and fades (damage, healing, loot counts). */
	floatText(x: number, y: number, text: string, color = '#ffffff', big = false): void {
		const label = this.scene.add
			.text(x, y, text, {
				fontFamily: 'system-ui, sans-serif',
				fontSize: big ? '22px' : '16px',
				color,
				stroke: '#000000',
				strokeThickness: 3
			})
			.setOrigin(0.5, 1)
			.setDepth(y + 100000);

		this.scene.tweens.add({
			targets: label,
			y: y - BALANCE.feedback.floatRisePx,
			alpha: { from: 1, to: 0 },
			duration: BALANCE.feedback.floatDurationMs,
			ease: 'Cubic.easeOut',
			onComplete: () => label.destroy()
		});
	}

	/** A short burst of dust/spark particles at an impact point. */
	burst(
		x: number,
		y: number,
		color: number = 0xd8c48a,
		count: number = BALANCE.feedback.hitParticles
	): void {
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
			const dot = this.scene.add.rectangle(x, y, 3, 3, color, 1).setDepth(y + 100000);
			const dist = BALANCE.feedback.particleSpeed * (0.5 + Math.random() * 0.7);
			this.scene.tweens.add({
				targets: dot,
				x: x + Math.cos(angle) * dist,
				y: y + Math.sin(angle) * dist - 6,
				alpha: { from: 1, to: 0 },
				scale: { from: 1, to: 0.4 },
				duration: BALANCE.feedback.particleLifeMs,
				ease: 'Quad.easeOut',
				onComplete: () => dot.destroy()
			});
		}
	}

	/** Convenience: a burst plus a floating number, colour-coded. */
	impact(x: number, y: number, damage: number, critical = false): void {
		const count = critical ? BALANCE.feedback.hitParticles + 4 : BALANCE.feedback.hitParticles;
		this.burst(x, y, critical ? 0xffd166 : 0xe0b088, count);
		this.floatText(
			x,
			y,
			critical ? `${damage}!` : `${damage}`,
			critical ? '#ffd166' : '#ffffff',
			critical
		);
	}
}
