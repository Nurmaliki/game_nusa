import { describe, it, expect } from 'vitest';
import { clampMagnitude, normalize, resolveMoveVelocity } from './movement';

describe('movement helpers', () => {
	it('normalizes vectors to unit length', () => {
		const n = normalize({ x: 3, y: 4 });
		expect(Math.hypot(n.x, n.y)).toBeCloseTo(1, 5);
	});

	it('returns zero for a zero vector', () => {
		expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
	});

	it('clamps magnitude larger than max', () => {
		const c = clampMagnitude({ x: 100, y: 0 }, 10);
		expect(c.x).toBeCloseTo(10, 5);
		expect(c.y).toBeCloseTo(0, 5);
	});

	it('leaves small vectors untouched', () => {
		const v = { x: 3, y: 0 };
		expect(clampMagnitude(v, 10)).toEqual(v);
	});

	it('uses walk speed when not sprinting', () => {
		const v = resolveMoveVelocity({ x: 1, y: 0 }, false, true, 170, 290);
		expect(v.x).toBeCloseTo(170, 5);
	});

	it('uses sprint speed when sprinting with energy', () => {
		const v = resolveMoveVelocity({ x: 1, y: 0 }, true, true, 170, 290);
		expect(v.x).toBeCloseTo(290, 5);
	});

	it('falls back to walk speed when sprint is blocked (no energy)', () => {
		const v = resolveMoveVelocity({ x: 1, y: 0 }, true, false, 170, 290);
		expect(v.x).toBeCloseTo(170, 5);
	});

	it('returns zero velocity for no input', () => {
		expect(resolveMoveVelocity({ x: 0, y: 0 }, true, true, 170, 290)).toEqual({ x: 0, y: 0 });
	});
});
