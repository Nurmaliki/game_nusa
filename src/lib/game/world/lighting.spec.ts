import { describe, expect, it } from 'vitest';
import { lightingForHour } from './lighting';

describe('lightingForHour', () => {
	it('is neutral (bright, no warmth) at midday', () => {
		const l = lightingForHour(12);
		expect(l.ambientAlpha).toBeLessThan(0.02);
		expect(l.warmAlpha).toBeLessThan(0.02);
	});

	it('is darkest at midnight', () => {
		const midnight = lightingForHour(0);
		const noon = lightingForHour(12);
		expect(midnight.ambientAlpha).toBeGreaterThan(noon.ambientAlpha);
		// Capped so night never blacks out.
		expect(midnight.ambientAlpha).toBeLessThanOrEqual(0.5);
	});

	it('tints night blue and stays readable', () => {
		const l = lightingForHour(0);
		// Deep-blue ambient: blue channel dominates red.
		const r = (l.ambientColor >> 16) & 0xff;
		const b = l.ambientColor & 0xff;
		expect(b).toBeGreaterThan(r);
	});

	it('adds warm golden light at sunset', () => {
		const sunset = lightingForHour(18);
		expect(sunset.warmAlpha).toBeGreaterThan(0.15);
		// Warm colour is orange-ish: red channel highest.
		const r = (sunset.warmColor >> 16) & 0xff;
		const g = (sunset.warmColor >> 8) & 0xff;
		const b = sunset.warmColor & 0xff;
		expect(r).toBeGreaterThan(g);
		expect(g).toBeGreaterThan(b);
	});

	it('adds warm light at dawn too', () => {
		expect(lightingForHour(6).warmAlpha).toBeGreaterThan(0.1);
	});

	it('changes gradually (no sudden jumps between adjacent minutes)', () => {
		let prev = lightingForHour(0);
		for (let h = 0; h <= 24; h += 1 / 60) {
			const cur = lightingForHour(h);
			expect(Math.abs(cur.ambientAlpha - prev.ambientAlpha)).toBeLessThan(0.03);
			expect(Math.abs(cur.warmAlpha - prev.warmAlpha)).toBeLessThan(0.03);
			prev = cur;
		}
	});

	it('wraps the hour and clamps out-of-range inputs', () => {
		expect(lightingForHour(25).ambientAlpha).toBeCloseTo(lightingForHour(1).ambientAlpha, 5);
		expect(lightingForHour(-1).ambientAlpha).toBeCloseTo(lightingForHour(23).ambientAlpha, 5);
	});

	it('daytime has no ambient tint and no warmth across the whole bright band', () => {
		for (let h = 9; h <= 15; h++) {
			const l = lightingForHour(h);
			expect(l.ambientAlpha).toBeLessThan(0.05);
			expect(l.warmAlpha).toBeLessThan(0.05);
		}
	});
});
