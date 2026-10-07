import Phaser from 'phaser';

/**
 * Camera-fixed foreground & framing (see §14 depth / §28 foreground system).
 *
 * Two cheap, original effects that give the top-down world a sense of depth and
 * pull focus to the player *without* costing per-frame work:
 *
 * 1. A soft VIGNETTE — darkened rounded corners that frame the view like a
 *    cozy farm-life RPG, focusing the eye on the centre.
 * 2. FOREGROUND FOLIAGE — a few dark tropical-leaf silhouettes along the bottom
 *    and side edges, drawn above the world (below the HUD). They scroll with the
 *    camera at a slight parallax so the world feels layered rather than flat.
 *
 * Everything is drawn procedurally into one canvas texture each (no assets) and
 * laid out once; resizing re-lays them. Presentation only — touches no gameplay.
 */
export class Foreground {
	private scene: Phaser.Scene;
	private vignette?: Phaser.GameObjects.Image;
	private leaves: Phaser.GameObjects.Image[] = [];
	private glow?: Phaser.GameObjects.Image;
	private readonly vignetteKey = 'fg_vignette';
	private readonly leafKey = 'fg_leaf';
	private readonly glowKey = 'fg_glow';

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.ensureTextures();
		this.buildVignette();
		this.buildLeaves();
		this.buildGlow();
	}

	/** Paint the vignette + leaf textures once (idempotent via texture keys). */
	private ensureTextures(): void {
		if (!this.scene.textures.exists(this.vignetteKey)) {
			const size = 256;
			const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
			// Rounded-rect band of darkness: transparent centre, dark edges. Built
			// by stacking increasing insets so the corners darken more than the
			// edges — a soft, cozy frame rather than a hard border.
			for (let i = 0; i < 48; i++) {
				const t = i / 47; // 0 inner → 1 outer
				const inset = t * (size / 2);
				g.fillStyle(0x07140d, 0.03);
				g.fillRect(inset * 0.55, inset * 0.35, size - inset * 1.1, size - inset * 0.7);
			}
			g.generateTexture(this.vignetteKey, size, size);
			g.destroy();
		}
		if (!this.scene.textures.exists(this.leafKey)) {
			const w = 120;
			const h = 80;
			const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
			// A stylised dark tropical frond: a rib along the bottom with leaflets
			// fanning up and outward, so it reads as foreground foliage (see §28).
			const dark = 0x10301d;
			const darker = 0x0a2013;
			// Central rib.
			g.fillStyle(darker, 1);
			g.fillRect(0, h - 10, w, 8);
			// Leaflets: long tapered blades leaning outward from the rib.
			g.fillStyle(dark, 1);
			const n = 9;
			for (let i = 0; i < n; i++) {
				const baseX = 8 + i * 13;
				const reach = 34 + (i % 3) * 10;
				const tipX = baseX + (i < n / 2 ? -reach * 0.6 : reach * 0.6);
				const tipY = 6 + (i % 2) * 6;
				g.fillTriangle(baseX - 4, h - 10, tipX, tipY, baseX + 6, h - 10);
			}
			// A lighter top edge so the silhouette separates from the dark ground.
			g.fillStyle(0x183f26, 0.85);
			g.fillRect(0, h - 10, w, 2);
			g.generateTexture(this.leafKey, w, h);
			g.destroy();
		}
		if (!this.scene.textures.exists(this.glowKey)) {
			const size = 256;
			const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
			// A soft warm radial glow for the player's "lantern" at night. Built by
			// stacking shrinking circles with low alpha so the falloff is smooth.
			const cx = size / 2;
			for (let i = 40; i > 0; i--) {
				const r = (i / 40) * (size / 2);
				g.fillStyle(0xffd591, 0.028);
				g.fillCircle(cx, cx, r);
			}
			g.generateTexture(this.glowKey, size, size);
			g.destroy();
		}
	}

	/**
	 * A world-space warm glow that follows the player, lifting the darkness at
	 * night (a carried lantern). ADD blend keeps it a light, not a wash; it is
	 * hidden by day and faded in with the ambient darkness.
	 */
	private buildGlow(): void {
		this.glow = this.scene.add
			.image(0, 0, this.glowKey)
			.setScrollFactor(1)
			.setDepth(49000)
			.setBlendMode(Phaser.BlendModes.ADD)
			.setVisible(false);
	}

	private buildVignette(): void {
		this.vignette = this.scene.add
			.image(0, 0, this.vignetteKey)
			.setOrigin(0, 0)
			.setScrollFactor(0)
			.setDepth(49990)
			.setAlpha(0.6);
		this.layoutVignette();
	}

	private layoutVignette(): void {
		if (!this.vignette) return;
		this.vignette.setDisplaySize(this.scene.scale.width, this.scene.scale.height);
	}

	/**
	 * Place a handful of fronds along the screen edges. Positions are expressed
	 * as fractions of the viewport so they re-lay correctly on resize.
	 */
	private buildLeaves(): void {
		// Fronds hug the bottom corners only, at low alpha, so they add a quiet
		// sense of foreground framing without reading as objects on the ground.
		const spots: { fx: number; fy: number; scale: number; angle: number; flip: boolean }[] = [
			{ fx: 0.04, fy: 1.03, scale: 1.9, angle: -8, flip: false },
			{ fx: 0.96, fy: 1.03, scale: 1.9, angle: 8, flip: true }
		];
		for (const s of spots) {
			const img = this.scene.add
				.image(0, 0, this.leafKey)
				.setOrigin(0.5, 1)
				.setScrollFactor(0)
				.setDepth(49995)
				.setAlpha(0.8)
				.setScale(s.scale)
				.setAngle(s.angle);
			if (s.flip) img.setFlipX(true);
			// Store the layout fractions on the object for re-layout.
			img.setData('fx', s.fx);
			img.setData('fy', s.fy);
			this.leaves.push(img);
		}
		this.layoutLeaves();
	}

	private layoutLeaves(): void {
		const w = this.scene.scale.width;
		const h = this.scene.scale.height;
		for (const img of this.leaves) {
			const fx = (img.getData('fx') as number) ?? 0;
			const fy = (img.getData('fy') as number) ?? 1;
			img.setPosition(fx * w, fy * h);
		}
	}

	/** Re-lay the framing after a viewport resize. */
	resize(): void {
		this.layoutVignette();
		this.layoutLeaves();
	}

	/** Gentle sway so the fronds feel alive (skipped under reduced motion). */
	update(
		timeMs: number,
		reducedMotion: boolean,
		playerX: number,
		playerY: number,
		darkness: number
	): void {
		// Player lantern: follows the player and fades in as night falls.
		if (this.glow) {
			const glowAlpha = Math.max(0, Math.min(0.85, (darkness - 0.35) * 1.6));
			this.glow.setPosition(playerX, playerY - 6);
			this.glow.setAlpha(glowAlpha);
			this.glow.setVisible(glowAlpha > 0.02 && !reducedMotion);
			// A faint breathing flicker so it reads as firelight, not a static blob.
			const flick = 1 + Math.sin(timeMs / 240) * 0.03 + Math.sin(timeMs / 97) * 0.015;
			this.glow.setScale(flick);
		}
		if (reducedMotion) return;
		for (let i = 0; i < this.leaves.length; i++) {
			const img = this.leaves[i];
			const base = img.getData('baseAngle') as number | undefined;
			const b = base ?? img.angle;
			if (base === undefined) img.setData('baseAngle', b);
			img.setAngle(b + Math.sin(timeMs / 900 + i * 1.3) * 1.6);
		}
	}

	destroy(): void {
		this.vignette?.destroy();
		this.vignette = undefined;
		this.glow?.destroy();
		this.glow = undefined;
		for (const l of this.leaves) l.destroy();
		this.leaves = [];
		if (this.scene.textures.exists(this.vignetteKey)) this.scene.textures.remove(this.vignetteKey);
		if (this.scene.textures.exists(this.leafKey)) this.scene.textures.remove(this.leafKey);
		if (this.scene.textures.exists(this.glowKey)) this.scene.textures.remove(this.glowKey);
	}
}
