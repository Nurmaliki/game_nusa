import { describe, it, expect } from 'vitest';
import { ChunkManager, chunkKey } from './chunk-manager';
import { BALANCE } from '../config/balance';

const SEED = 12345;

describe('ChunkManager biomeAt', () => {
	it('coast at the edges, rainforest, highlands, then the volcanic core', () => {
		const cm = new ChunkManager(SEED);
		// Walk from the centre (normalized distance 1) out to the edge (0). The
		// bands are: volcanic >=0.90, highlands >=0.74, rainforest >=0.42, coast.
		const cx = cm.pixelWidth / 2;
		const cy = cm.pixelHeight / 2;
		const half = Math.min(cm.pixelWidth, cm.pixelHeight) / 2;
		const atOutward = (outward: number) => cm.biomeAt(cx + half * outward, cy).id; // offset along +x
		expect(atOutward(0.7)).toBe('tropical_coast');
		expect(atOutward(0.5)).toBe('rainforest');
		expect(atOutward(0.2)).toBe('highlands');
		expect(atOutward(0.02)).toBe('volcanic');
		expect(cm.biomeAt(cx, cy).id).toBe('volcanic');
	});

	it('is deterministic for the same seed', () => {
		const a = new ChunkManager(SEED);
		const b = new ChunkManager(SEED);
		for (const [x, y] of [
			[500, 500],
			[1500, 900],
			[3000, 3000]
		]) {
			expect(a.biomeAt(x, y).id).toBe(b.biomeAt(x, y).id);
		}
	});

	it('is stable across repeated calls (memoized jitter preserves the result)', () => {
		const cm = new ChunkManager(SEED);
		for (const [x, y] of [
			[640, 640],
			[641, 639], // same 256px cell → identical jitter
			[1024, 2048]
		]) {
			const first = cm.biomeAt(x, y).id;
			for (let i = 0; i < 5; i++) {
				expect(cm.biomeAt(x, y).id).toBe(first);
			}
		}
	});
});

describe('ChunkManager chunk generation determinism', () => {
	it('produces identical chunks for identical seed+coords', () => {
		const a = new ChunkManager(SEED);
		const b = new ChunkManager(SEED);
		const ca = a.getChunk({ cx: 3, cy: 4 });
		const cb = b.getChunk({ cx: 3, cy: 4 });
		expect(ca.nodes).toEqual(cb.nodes);
		expect(ca.biome.id).toBe(cb.biome.id);
	});

	it('different seeds differ', () => {
		const a = new ChunkManager(1);
		const b = new ChunkManager(2);
		expect(a.getChunk({ cx: 2, cy: 2 }).nodes).not.toEqual(b.getChunk({ cx: 2, cy: 2 }).nodes);
	});

	it('assigns stable instance ids unique within a chunk', () => {
		const cm = new ChunkManager(SEED);
		const chunk = cm.getChunk({ cx: 5, cy: 5 });
		const ids = chunk.nodes.map((n) => n.instanceId);
		expect(new Set(ids).size).toBe(ids.length);
		// Stable across regeneration with a fresh manager.
		const cm2 = new ChunkManager(SEED);
		expect(cm2.getChunk({ cx: 5, cy: 5 }).nodes.map((n) => n.instanceId)).toEqual(ids);
	});

	it('caches chunks (same object reference)', () => {
		const cm = new ChunkManager(SEED);
		expect(cm.getChunk({ cx: 1, cy: 1 })).toBe(cm.getChunk({ cx: 1, cy: 1 }));
	});
});

describe('ChunkManager active radius', () => {
	it('activates the chunks around the player', () => {
		const cm = new ChunkManager(SEED);
		const r = BALANCE.world.activeRadiusChunks;
		const chunkPx = BALANCE.world.chunkSizeTiles * BALANCE.world.tileSize;
		const center = { cx: 8, cy: 8 };
		cm.updateActive(center.cx * chunkPx + chunkPx / 2, center.cy * chunkPx + chunkPx / 2);
		expect(cm.isActive(center.cx, center.cy)).toBe(true);
		expect(cm.isActive(center.cx + r, center.cy)).toBe(true);
		expect(cm.isActive(center.cx + r + 1, center.cy)).toBe(false);
	});

	it('reports entered chunks on the first update', () => {
		const cm = new ChunkManager(SEED);
		const chunkPx = BALANCE.world.chunkSizeTiles * BALANCE.world.tileSize;
		const { entered } = cm.updateActive(8 * chunkPx + 16, 8 * chunkPx + 16);
		expect(entered.length).toBeGreaterThan(0);
	});

	it('reports exited chunks when the player moves far', () => {
		const cm = new ChunkManager(SEED);
		const chunkPx = BALANCE.world.chunkSizeTiles * BALANCE.world.tileSize;
		cm.updateActive(1 * chunkPx + 16, 1 * chunkPx + 16);
		const { exited } = cm.updateActive(14 * chunkPx + 16, 14 * chunkPx + 16);
		expect(exited.length).toBeGreaterThan(0);
	});
});

describe('chunkKey', () => {
	it('is stable', () => {
		expect(chunkKey(3, -2)).toBe('3,-2');
	});
});
