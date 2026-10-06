import { describe, it, expect } from 'vitest';
import { hex, vivid } from './map-paint';
import { BIOMES, BIOME_LIST } from '$data/biomes';

/**
 * The world-map painter is DOM/canvas based (verified visually + in E2E), so the
 * unit tests cover the pure colour helpers that shape how the map reads.
 */

describe('hex', () => {
	it('formats an 0xRRGGBB int as #rrggbb', () => {
		expect(hex(0x4a7d5a)).toBe('#4a7d5a');
		expect(hex(0x000000)).toBe('#000000');
		expect(hex(0xffffff)).toBe('#ffffff');
	});

	it('pads short values and masks to 24 bits', () => {
		expect(hex(0x0000ff)).toBe('#0000ff');
		expect(hex(0x1ffffff)).toBe('#ffffff');
	});
});

describe('vivid', () => {
	it('lifts every channel (a colour is never darker after vivid)', () => {
		for (const c of Object.values(BIOMES)) {
			const out = vivid(c.groundColor);
			const before = c.groundColor;
			const lum = (v: number) => ((v >> 16) & 0xff) + ((v >> 8) & 0xff) + (v & 0xff);
			expect(lum(out)).toBeGreaterThanOrEqual(lum(before));
		}
	});

	it('keeps channels within 0..255', () => {
		for (const input of [0x000000, 0xffffff, 0x4a7d5a, 0x3a2f33]) {
			const out = vivid(input);
			expect((out >> 16) & 0xff).toBeLessThanOrEqual(255);
			expect((out >> 8) & 0xff).toBeLessThanOrEqual(255);
			expect(out & 0xff).toBeLessThanOrEqual(255);
		}
	});

	it('is deterministic', () => {
		expect(vivid(0x4a7d5a)).toBe(vivid(0x4a7d5a));
	});
});

describe('biome bands', () => {
	it('are ordered by startRadius ascending (map legend relies on it)', () => {
		const radii = BIOME_LIST.map((b) => b.startRadius);
		const sorted = [...radii].sort((a, b) => a - b);
		expect(radii).toEqual(sorted);
	});

	it('every biome has a distinct name', () => {
		const names = BIOME_LIST.map((b) => b.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
