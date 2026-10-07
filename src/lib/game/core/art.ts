import Phaser from 'phaser';

/**
 * Programmatic pixel-art helpers (see §35).
 *
 * These functions draw ORIGINAL sprites with plain Phaser graphics operations.
 * No external assets are ever loaded. Every sprite is built from layered
 * rectangles / polygons with shading so the placeholder world reads clearly as
 * trees, rocks, animals, etc — not flat primitives — while remaining obviously
 * temporary and easy to swap for real art later.
 */

/** A drawing surface plus its size, passed to sprite painters. */
export interface Canvas {
	scene: Phaser.Scene;
	width: number;
	height: number;
}

/**
 * Paint `key` into a texture using `paint`. Skips silently if the texture
 * already exists so calls are idempotent (textures live for the game lifetime).
 */
export function paint(
	scene: Phaser.Scene,
	key: string,
	width: number,
	height: number,
	painter: (g: Phaser.GameObjects.Graphics, c: Canvas) => void
): void {
	if (scene.textures.exists(key)) return;
	const g = scene.make.graphics({ x: 0, y: 0 }, false);
	painter(g, { scene, width, height });
	g.generateTexture(key, width, height);
	g.destroy();
}

/** Fill a rect with a solid colour. */
export function rect(
	g: Phaser.GameObjects.Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	color: number,
	alpha = 1
): void {
	g.fillStyle(color, alpha);
	g.fillRect(x, y, w, h);
}

/** Fill a rect with a subtle vertical gradient (2 bands) for cheap depth. */
export function vgrad(
	g: Phaser.GameObjects.Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	top: number,
	bottom: number
): void {
	const half = Math.max(1, Math.floor(h / 2));
	rect(g, x, y, w, half, top);
	rect(g, x, y + half, w, h - half, bottom);
}

/** Fill an ellipse approximately with stacked rows (crisp, pixel-art style). */
export function ellipse(
	g: Phaser.GameObjects.Graphics,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	color: number,
	alpha = 1
): void {
	g.fillStyle(color, alpha);
	const steps = Math.max(3, Math.round(ry) * 2);
	for (let i = 0; i < steps; i++) {
		const t = (i + 0.5) / steps; // 0..1 down the ellipse
		const yy = cy - ry + t * ry * 2;
		const dy = (yy - cy) / ry;
		const w = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
		if (w >= 0.5) g.fillRect(cx - w, yy, w * 2, Math.max(1, (ry * 2) / steps + 0.6));
	}
}

/** Filled polygon from an array of [x,y] points. */
export function poly(
	g: Phaser.GameObjects.Graphics,
	points: [number, number][],
	color: number,
	alpha = 1
): void {
	g.fillStyle(color, alpha);
	g.fillPoints(
		points.map(([x, y]) => new Phaser.Math.Vector2(x, y)),
		true
	);
}

/** Filled circle with a slightly darker rim (adds weight to small sprites). */
export function ball(
	g: Phaser.GameObjects.Graphics,
	cx: number,
	cy: number,
	r: number,
	color: number,
	rim?: number
): void {
	if (rim !== undefined) {
		g.fillStyle(rim, 1);
		g.fillCircle(cx, cy, r);
		g.fillStyle(color, 1);
		g.fillCircle(cx, cy, r - Math.max(1, r * 0.18));
		g.fillStyle(shade(color, 1.18), 1);
		g.fillCircle(cx - r * 0.28, cy - r * 0.28, Math.max(1, r * 0.32));
	} else {
		g.fillStyle(color, 1);
		g.fillCircle(cx, cy, r);
	}
}

/** Lighten (factor > 1) or darken (factor < 1) an 0xRRGGBB colour. */
export function shade(color: number, factor: number): number {
	const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 0xff) * factor)));
	const gr = Math.min(255, Math.max(0, Math.round(((color >> 8) & 0xff) * factor)));
	const b = Math.min(255, Math.max(0, Math.round((color & 0xff) * factor)));
	return (r << 16) | (gr << 8) | b;
}

/**
 * Scatter small deterministic "pixel" dabs across a region for texture.
 *
 * Uses a tiny LCG seeded per-call so a texture is identical every time it is
 * painted (important: the sprite regression snapshot hashes the op stream).
 */
export function scatter(
	g: Phaser.GameObjects.Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	count: number,
	color: number,
	seed = 1,
	alpha = 1,
	dot = 1
): void {
	let s = seed >>> 0 || 1;
	const rnd = () => {
		// Numerical Recipes LCG — cheap + deterministic.
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 0xffffffff;
	};
	g.fillStyle(color, alpha);
	for (let i = 0; i < count; i++) {
		const px = x + Math.floor(rnd() * w);
		const py = y + Math.floor(rnd() * h);
		g.fillRect(px, py, dot, dot);
	}
}

/** A short blade / tuft of grass (two stacked rects) for organic detail. */
export function tuft(
	g: Phaser.GameObjects.Graphics,
	x: number,
	y: number,
	h: number,
	color: number
): void {
	rect(g, x, y, 1, h, color);
	rect(g, x + 1, y + 1, 1, h - 1, shade(color, 1.15));
}

/** Blend two 0xRRGGBB colours; t=0 returns a, t=1 returns b. */
export function mix(a: number, b: number, t: number): number {
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;
	const r = Math.round(ar + (br - ar) * t);
	const g = Math.round(ag + (bg - ag) * t);
	const bl = Math.round(ab + (bb - ab) * t);
	return (r << 16) | (g << 8) | bl;
}
