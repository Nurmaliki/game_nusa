import { describe, expect, it, vi } from 'vitest';
import { SPRITE_KEYS } from './sprite-keys';

/**
 * Sprite regression guard (see §35).
 *
 * Every sprite is drawn programmatically by a painter that emits plain Phaser
 * Graphics ops. There are no external assets, so a stray edit (a colour typo,
 * a missing draw call, a painter that silently falls back to a blank texture)
 * is invisible until someone plays the game.
 *
 * We cannot run real Phaser in the node test env, so we record the *draw ops*
 * each painter emits into a fake Graphics and snapshot a compact fingerprint:
 * the number of ops by kind, the bounding box, and an op-count digest. The
 * exact pixels aren't asserted (that would be brittle), but the SHAPE of the
 * drawing is — so a painter that stops drawing, or changes drastically, fails.
 */

// Phaser only supplies Math.Vector2 at runtime here (everything else is type-only
// and erased). A minimal stub lets sprites.ts/art.ts import cleanly.
vi.mock('phaser', () => ({
	default: {
		Math: {
			Vector2: class {
				constructor(
					public x: number,
					public y: number
				) {}
			}
		}
	}
}));

/** Minimal recording stand-in for Phaser.GameObjects.Graphics. */
interface Op {
	kind: 'fillRect' | 'fillCircle' | 'fillPoints' | 'lineBetween';
	color: number;
	alpha: number;
	/** Bounding extent of the op (x1,y1..x2,y2). */
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

class RecordingGraphics {
	ops: Op[] = [];
	private color = 0;
	private alpha = 1;

	fillStyle(color: number, alpha = 1): this {
		this.color = color;
		this.alpha = alpha;
		return this;
	}
	lineStyle(_w: number, color: number, alpha = 1): this {
		this.color = color;
		this.alpha = alpha;
		return this;
	}
	fillRect(x: number, y: number, w: number, h: number): this {
		this.ops.push({
			kind: 'fillRect',
			color: this.color,
			alpha: this.alpha,
			x1: x,
			y1: y,
			x2: x + w,
			y2: y + h
		});
		return this;
	}
	fillCircle(x: number, y: number, r: number): this {
		this.ops.push({
			kind: 'fillCircle',
			color: this.color,
			alpha: this.alpha,
			x1: x - r,
			y1: y - r,
			x2: x + r,
			y2: y + r
		});
		return this;
	}
	fillPoints(points: { x: number; y: number }[]): this {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const p of points) {
			minX = Math.min(minX, p.x);
			minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
		this.ops.push({
			kind: 'fillPoints',
			color: this.color,
			alpha: this.alpha,
			x1: minX,
			y1: minY,
			x2: maxX,
			y2: maxY
		});
		return this;
	}
	lineBetween(x1: number, y1: number, x2: number, y2: number): this {
		this.ops.push({ kind: 'lineBetween', color: this.color, alpha: this.alpha, x1, y1, x2, y2 });
		return this;
	}
	strokeRect(x: number, y: number, w: number, h: number): this {
		this.ops.push({
			kind: 'lineBetween',
			color: this.color,
			alpha: this.alpha,
			x1: x,
			y1: y,
			x2: x + w,
			y2: y + h
		});
		return this;
	}
	strokeEllipse(cx: number, cy: number, rx: number, ry: number): this {
		this.ops.push({
			kind: 'lineBetween',
			color: this.color,
			alpha: this.alpha,
			x1: cx - rx,
			y1: cy - ry,
			x2: cx + rx,
			y2: cy + ry
		});
		return this;
	}
	generateTexture(): this {
		return this;
	}
	destroy(): void {}
}

/** A stable fingerprint describing the shape of a painter's drawing. */
function fingerprint(g: RecordingGraphics): {
	ops: number;
	rects: number;
	circles: number;
	polys: number;
	lines: number;
	bbox: [number, number, number, number];
	digest: string;
} {
	const rects = g.ops.filter((o) => o.kind === 'fillRect').length;
	const circles = g.ops.filter((o) => o.kind === 'fillCircle').length;
	const polys = g.ops.filter((o) => o.kind === 'fillPoints').length;
	const lines = g.ops.filter((o) => o.kind === 'lineBetween').length;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const o of g.ops) {
		minX = Math.min(minX, o.x1);
		minY = Math.min(minY, o.y1);
		maxX = Math.max(maxX, o.x2);
		maxY = Math.max(maxY, o.y2);
	}
	// A cheap order-sensitive digest of the op stream.
	let h = 2166136261 >>> 0;
	for (const o of g.ops) {
		const s = `${o.kind}:${o.color}:${o.alpha.toFixed(2)}`;
		for (let i = 0; i < s.length; i++) h = (Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0) >>> 0;
	}
	return {
		ops: g.ops.length,
		rects,
		circles,
		polys,
		lines,
		bbox: [minX, minY, maxX, maxY],
		digest: h.toString(16)
	};
}

// Imported after the phaser mock is registered.
const { ensureSprites } = await import('./sprites');

describe('sprite painters', () => {
	/** Paint every sprite once and record what each painter drew. */
	async function paintAll() {
		const perKey = new Map<string, RecordingGraphics>();
		// generateTexture is the moment a painter finishes — record key -> graphics.
		const rec = RecordingGraphics.prototype as unknown as {
			generateTexture: (k: string) => void;
		};
		rec.generateTexture = function (this: RecordingGraphics, key: string) {
			perKey.set(key, this);
		};
		const sceneProxy = {
			make: { graphics: () => new RecordingGraphics() },
			textures: { exists: () => false }
		};
		ensureSprites(sceneProxy as never);
		return { perKey };
	}

	it('paints every declared sprite key', async () => {
		const { perKey } = await paintAll();
		const declared = Object.values(SPRITE_KEYS);
		for (const key of declared) {
			expect(perKey.has(key), `no painter generated texture "${key}"`).toBe(true);
		}
		// No stray textures beyond the declared keys.
		expect(perKey.size).toBe(declared.length);
	});

	it('every sprite draws a non-trivial number of ops', async () => {
		const { perKey } = await paintAll();
		for (const [key, g] of perKey) {
			expect(g.ops.length, `"${key}" drew nothing`).toBeGreaterThan(0);
		}
	});

	it('draws within (or near) the sprite bounds', async () => {
		const { perKey } = await paintAll();
		for (const [key, g] of perKey) {
			const fp = fingerprint(g);
			// Some sprites (shadow ellipses, tongues) intentionally overhang a
			// little; clamp generously to catch wildly-wrong coordinates only.
			expect(fp.bbox[0], `${key} min x`).toBeGreaterThan(-8);
			expect(fp.bbox[1], `${key} min y`).toBeGreaterThan(-8);
			expect(fp.bbox[2], `${key} max x`).toBeLessThan(80);
			expect(fp.bbox[3], `${key} max y`).toBeLessThan(80);
		}
	});

	it('matches the recorded fingerprints (regression guard)', async () => {
		const { perKey } = await paintAll();
		const summary: Record<string, ReturnType<typeof fingerprint>> = {};
		for (const [key, g] of [...perKey].sort(([a], [b]) => a.localeCompare(b))) {
			summary[key] = fingerprint(g);
		}
		expect(summary).toMatchSnapshot();
	});

	it('is deterministic across runs (same op counts)', async () => {
		const a = await paintAll();
		const b = await paintAll();
		for (const [key, g] of a.perKey) {
			expect(b.perKey.get(key)!.ops.length, `${key} op count differs`).toBe(g.ops.length);
		}
	});
});
