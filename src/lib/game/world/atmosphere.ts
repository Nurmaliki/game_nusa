import Phaser from 'phaser';

/**
 * Ambient atmospheric particles (see §19 ambient animation / §30 atmosphere).
 *
 * A single camera-fixed particle emitter that drifts motes across the viewport:
 * warm floating pollen by day, cool fireflies at night. It is presentation only
 * and always-on but very cheap (a handful of particles). Suppressed entirely
 * under reduced motion.
 *
 * Swapping the tint/colour by time-of-day is done from the scene each frame; the
 * emitter itself never restarts, so there is no per-frame allocation.
 */
export class Atmosphere {
	private scene: Phaser.Scene;
	private emitter?: Phaser.GameObjects.Particles.ParticleEmitter;
	private currentWarm: boolean | null = null;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.ensureTexture();
	}

	/** A tiny soft 2px mote (white, tinted at runtime). */
	private ensureTexture(): void {
		const key = 'atmo_mote';
		if (this.scene.textures.exists(key)) return;
		const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
		g.fillStyle(0xffffff, 1);
		g.fillCircle(2, 2, 2);
		g.fillStyle(0xffffff, 0.5);
		g.fillCircle(2, 2, 3);
		g.generateTexture(key, 6, 6);
		g.destroy();
	}

	private makeEmitter(): Phaser.GameObjects.Particles.ParticleEmitter {
		const w = this.scene.scale.width;
		const h = this.scene.scale.height;
		return this.scene.add
			.particles(0, 0, 'atmo_mote', {
				x: { min: -20, max: w + 20 },
				y: { min: -20, max: h + 20 },
				lifespan: { min: 5000, max: 9000 },
				speedX: { min: -8, max: 14 },
				speedY: { min: -14, max: -2 },
				scale: { min: 0.5, max: 1.1 },
				alpha: { start: 0, end: 0 },
				quantity: 1,
				frequency: 420,
				maxAliveParticles: 26
			})
			.setScrollFactor(0)
			.setDepth(49980);
	}

	/**
	 * Keep the emitter in sync with the viewport and nudge its tint/alpha toward
	 * the current hour: warm pollen in daylight, cool glowing fireflies at night.
	 */
	update(timeMs: number, hour: number, reducedMotion: boolean): void {
		if (reducedMotion) {
			if (this.emitter) {
				this.emitter.destroy();
				this.emitter = undefined;
				this.currentWarm = null;
			}
			return;
		}
		if (!this.emitter) {
			this.emitter = this.makeEmitter();
		}

		// Night = cool fireflies (twinkling, brighter), day = warm pollen (faint).
		const isNight = hour >= 18.5 || hour < 5.5;
		if (isNight !== this.currentWarm) {
			this.currentWarm = isNight;
			if (isNight) {
				this.emitter.setParticleTint(0xfff2a8);
				this.emitter.setFrequency(600);
			} else {
				this.emitter.setParticleTint(0xfff4d0);
				this.emitter.setFrequency(420);
			}
		}
		// Slow twinkle: fade the whole emitter's alpha a touch over time.
		const twinkle = isNight ? 0.6 + Math.sin(timeMs / 700) * 0.35 : 0.35;
		this.emitter.setAlpha(twinkle);
	}

	/** Rebuild the emitter's spawn band after a viewport resize. */
	resize(): void {
		if (!this.emitter) return;
		this.emitter.destroy();
		this.emitter = this.makeEmitter();
		this.currentWarm = null;
	}

	destroy(): void {
		this.emitter?.destroy();
		this.emitter = undefined;
	}
}
