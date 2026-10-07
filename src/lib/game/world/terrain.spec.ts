import { describe, it, expect } from 'vitest';
import {
	cellHash,
	dirtFieldAt,
	fbm2D,
	grassToneAt,
	hubRing,
	nearestPath,
	opennessAt,
	pathCurves,
	pathIntensity,
	valueNoise2D
} from './terrain';

const SEED = 987654;
const W = 16384;
const H = 16384;

describe('valueNoise2D / fbm2D', () => {
	it('stays within [0,1]', () => {
		for (let i = 0; i < 200; i++) {
			const x = (i * 137.5) % W;
			const y = (i * 91.3) % H;
			const n = valueNoise2D(SEED, x / 50, y / 50);
			expect(n).toBeGreaterThanOrEqual(0);
			expect(n).toBeLessThanOrEqual(1);
			const f = fbm2D(SEED, x / 260, y / 260);
			expect(f).toBeGreaterThanOrEqual(0);
			expect(f).toBeLessThanOrEqual(1);
		}
	});

	it('is deterministic for identical inputs', () => {
		expect(fbm2D(SEED, 3.2, 7.9)).toBe(fbm2D(SEED, 3.2, 7.9));
		expect(valueNoise2D(SEED, 12.5, 4.25)).toBe(valueNoise2D(SEED, 12.5, 4.25));
	});

	it('is continuous across lattice boundaries (seamless, no jumps)', () => {
		// Sampling either side of an integer lattice line must not jump.
		const a = valueNoise2D(SEED, 10.001, 5.5);
		const b = valueNoise2D(SEED, 9.999, 5.5);
		expect(Math.abs(a - b)).toBeLessThan(0.02);
	});
});

describe('grassToneAt / dirtFieldAt / opennessAt', () => {
	it('produce values in [0,1]', () => {
		for (let i = 0; i < 100; i++) {
			const x = (i * 233) % W;
			const y = (i * 571) % H;
			expect(grassToneAt(SEED, x, y)).toBeGreaterThanOrEqual(0);
			expect(grassToneAt(SEED, x, y)).toBeLessThanOrEqual(1);
			const d = dirtFieldAt(SEED, x, y);
			expect(d).toBeGreaterThanOrEqual(0);
			expect(d).toBeLessThanOrEqual(1);
			expect(opennessAt(SEED, x, y)).toBeGreaterThanOrEqual(0);
			expect(opennessAt(SEED, x, y)).toBeLessThanOrEqual(1);
		}
	});

	it('dirt is sparse (most samples are 0)', () => {
		let zero = 0;
		const n = 400;
		for (let i = 0; i < n; i++) {
			if (dirtFieldAt(SEED, (i * 331) % W, (i * 97) % H) === 0) zero++;
		}
		expect(zero / n).toBeGreaterThan(0.5);
	});
});

describe('paths', () => {
	it('pathCurves returns polylines with several points each', () => {
		const curves = pathCurves(SEED, W, H);
		expect(curves.length).toBeGreaterThanOrEqual(2);
		for (const c of curves) {
			expect(c.points.length).toBeGreaterThan(3);
			expect(c.width).toBeGreaterThan(0);
		}
	});

	it('pathCurves is deterministic for a seed', () => {
		expect(pathCurves(SEED, W, H)).toEqual(pathCurves(SEED, W, H));
	});

	it('hubRing is centred low on the map', () => {
		const ring = hubRing(W, H);
		expect(ring.cx).toBeCloseTo(W / 2);
		expect(ring.cy).toBeGreaterThan(H * 0.7);
		expect(ring.r).toBeGreaterThan(0);
	});

	it('nearestPath distance is 0 on a trail centreline and grows away', () => {
		const curves = pathCurves(SEED, W, H);
		const p = curves[0].points[2];
		const on = nearestPath(SEED, p.x, p.y, W, H);
		expect(on.distance).toBeLessThan(1);
		const off = nearestPath(SEED, p.x + 500, p.y + 500, W, H);
		expect(off.distance).toBeGreaterThan(on.distance);
	});

	it('pathIntensity is 1 on the centreline and 0 far away', () => {
		const curves = pathCurves(SEED, W, H);
		const p = curves[0].points[3];
		expect(pathIntensity(SEED, p.x, p.y, W, H)).toBe(1);
		// A point far from any trail (corner of the map) should be 0.
		expect(pathIntensity(SEED, 50, 50, W, H)).toBe(0);
	});
});

describe('cellHash', () => {
	it('is deterministic and in [0,1)', () => {
		const a = cellHash(SEED, 4, 9);
		expect(a).toBe(cellHash(SEED, 4, 9));
		expect(a).toBeGreaterThanOrEqual(0);
		expect(a).toBeLessThan(1);
	});

	it('varies across cells', () => {
		const vals = new Set<number>();
		for (let i = 0; i < 50; i++) vals.add(cellHash(SEED, i, i * 3));
		expect(vals.size).toBeGreaterThan(40);
	});
});
