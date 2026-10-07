/**
 * Pure, Phaser-free terrain detail (see §7 ground / path system).
 *
 * Everything here is a deterministic function of *absolute world position* + the
 * world seed. That makes the fields inherently seamless across chunk borders —
 * two neighbouring chunks sampling the same world coordinate get the same value
 * — so the ground can be baked per chunk without visible seams.
 *
 * The renderer samples these to paint grass-tone patches, bare-earth blobs and
 * winding dirt paths. No engine state, no randomness at draw time.
 */

/** 2D value noise: deterministic, smooth, in [0,1]. Cheaper than Perlin/simplex. */
export function valueNoise2D(seed: number, x: number, y: number): number {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const xf = x - xi;
	const yf = y - yi;
	// Smoothstep for organic interpolation.
	const u = xf * xf * (3 - 2 * xf);
	const v = yf * yf * (3 - 2 * yf);
	const c00 = corner(seed, xi, yi);
	const c10 = corner(seed, xi + 1, yi);
	const c01 = corner(seed, xi, yi + 1);
	const c11 = corner(seed, xi + 1, yi + 1);
	const a = c00 + (c10 - c00) * u;
	const b = c01 + (c11 - c01) * u;
	return a + (b - a) * v;
}

/** A single deterministic noise lattice value in [0,1). */
function corner(seed: number, xi: number, yi: number): number {
	let h = (seed ^ Math.imul(xi, 0x27d4eb2d) ^ Math.imul(yi, 0x165667b1)) >>> 0;
	h = (h ^ (h >>> 15)) >>> 0;
	h = Math.imul(h, 0x2545f491) >>> 0;
	h = (h ^ (h >>> 13)) >>> 0;
	return h / 0xffffffff;
}

/** Fractal (multi-octave) value noise in [0,1]. `octaves` adds fine detail. */
export function fbm2D(seed: number, x: number, y: number, octaves = 3): number {
	let amp = 1;
	let freq = 1;
	let sum = 0;
	let norm = 0;
	for (let o = 0; o < octaves; o++) {
		sum += valueNoise2D((seed + o * 0x9e3779b1) >>> 0, x * freq, y * freq) * amp;
		norm += amp;
		amp *= 0.5;
		freq *= 2;
	}
	return sum / norm;
}

/**
 * Grass-tone field in [0,1]: 0 = darker/lusher, 1 = lighter/drier. Sampled at a
 * coarse world scale so it reads as large soft patches, not per-tile noise.
 */
export function grassToneAt(seed: number, x: number, y: number): number {
	return fbm2D(seed, x / 260, y / 260, 3);
}

/**
 * Bare-earth intensity in [0,1]: how much dirt shows through the grass at this
 * point. Higher near path edges and in a few natural clearings.
 */
export function dirtFieldAt(seed: number, x: number, y: number): number {
	const n = fbm2D((seed ^ 0x5bf03635) >>> 0, x / 190, y / 190, 3);
	// Bias so most ground is grass and dirt only appears in the rarer noisy
	// pockets (threshold high → sparse, organic bare patches).
	return Math.max(0, (n - 0.74) / 0.26);
}

export interface PathSample {
	/** Distance in world px to the nearest trail centreline. */
	distance: number;
	/** Trail centreline thickness in world px. */
	width: number;
}

export interface PathCurve {
	/** Sampled centreline points in world space. */
	points: { x: number; y: number }[];
	/** Trail thickness in world px. */
	width: number;
}

/**
 * The island's trail network as explicit polylines. Defined in world units so it
 * is seamless across chunks, and returned as geometry so the renderer can draw
 * *smooth* stroked curves rather than a blocky sampled field.
 */
export function pathCurves(seed: number, worldWidth: number, worldHeight: number): PathCurve[] {
	const phase = ((seed % 1000) / 1000) * Math.PI * 2;
	const step = 96;

	// Trail A: broadly N↔S, wobbling east/west.
	const a: { x: number; y: number }[] = [];
	for (let y = 0; y <= worldHeight; y += step) {
		const cx =
			worldWidth / 2 + Math.sin((y / worldHeight) * Math.PI * 1.6 + phase) * worldWidth * 0.09;
		a.push({ x: cx, y });
	}

	// Trail B: broadly W↔E, wobbling north/south.
	const b: { x: number; y: number }[] = [];
	for (let x = 0; x <= worldWidth; x += step) {
		const cy =
			worldHeight * 0.56 +
			Math.sin((x / worldWidth) * Math.PI * 1.4 + phase * 0.7) * worldHeight * 0.09;
		b.push({ x, y: cy });
	}

	return [
		{ points: a, width: 30 },
		{ points: b, width: 26 }
	];
}

/**
 * The island's spawn-hub ring trail (a circle path near the southern coast).
 * Returned as geometry so it can be stroked smoothly.
 */
export function hubRing(
	worldWidth: number,
	worldHeight: number
): { cx: number; cy: number; r: number; width: number } {
	return { cx: worldWidth * 0.5, cy: worldHeight * 0.86, r: 150, width: 22 };
}

/** Distance from a point to a polyline (segment-wise). */
function distToPolyline(pts: { x: number; y: number }[], x: number, y: number): number {
	let best = Infinity;
	for (let i = 0; i < pts.length - 1; i++) {
		const ax = pts[i].x;
		const ay = pts[i].y;
		const bx = pts[i + 1].x;
		const by = pts[i + 1].y;
		const dx = bx - ax;
		const dy = by - ay;
		const len2 = dx * dx + dy * dy || 1;
		let t = ((x - ax) * dx + (y - ay) * dy) / len2;
		t = Math.max(0, Math.min(1, t));
		const px = ax + t * dx;
		const py = ay + t * dy;
		best = Math.min(best, Math.hypot(x - px, y - py));
	}
	return best;
}

/**
 * Nearest-trail distance/width at a point (used for grass suppression along
 * paths so plants don't grow in the middle of a trail).
 */
export function nearestPath(
	seed: number,
	x: number,
	y: number,
	worldWidth: number,
	worldHeight: number
): PathSample {
	let best: PathSample = { distance: Infinity, width: 0 };
	for (const curve of pathCurves(seed, worldWidth, worldHeight)) {
		const d = distToPolyline(curve.points, x, y);
		if (d < best.distance) best = { distance: d, width: curve.width };
	}
	const ring = hubRing(worldWidth, worldHeight);
	const ringDist = Math.abs(Math.hypot(x - ring.cx, y - ring.cy) - ring.r);
	if (ringDist < best.distance) best = { distance: ringDist, width: ring.width };
	return best;
}

/**
 * Whole-island path intensity in [0,1] with a soft antialiased edge band. 1 on
 * the centreline, fading to 0 across `edge` px outside the trail width. Used to
 * keep vegetation from growing in the middle of a trail.
 */
export function pathIntensity(
	seed: number,
	x: number,
	y: number,
	worldWidth: number,
	worldHeight: number,
	edge = 14
): number {
	const { distance, width } = nearestPath(seed, x, y, worldWidth, worldHeight);
	const half = width / 2;
	if (distance <= half) return 1;
	if (distance >= half + edge) return 0;
	return 1 - (distance - half) / edge;
}

/** Stable per-cell hash in [0,1) for scatter decisions (twigs, flowers…). */
export function cellHash(seed: number, xi: number, yi: number): number {
	return corner(seed, xi, yi);
}

/**
 * 0..1 "openness" used to keep dense decor out of clearings/hubs. Derived from a
 * coarse noise field so it forms natural meadow openings.
 */
export function opennessAt(seed: number, x: number, y: number): number {
	return valueNoise2D((seed ^ 0x1b56c4e9) >>> 0, x / 420, y / 420);
}
