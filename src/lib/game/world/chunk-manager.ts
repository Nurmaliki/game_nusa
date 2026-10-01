import { BIOME_LIST, BIOMES, type BiomeDefinition } from '$data/biomes';
import { getResourceNode } from '$data/resources';
import { BALANCE } from '../config/balance';
import { hashString, mulberry32 } from './generator';

/** Blend two 0xRRGGBB colours; t=0 → a, t=1 → b. */
function mixHex(a: number, b: number, t: number): number {
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

/**
 * Chunk-based world management (see §8 / §41).
 *
 * The world is divided into chunks of `chunkSizeTiles`. Only chunks within
 * `activeRadiusChunks` of the player are materialised. Chunk content is
 * DETERMINISTIC from (worldSeed, chunkX, chunkY) so it never needs to be stored
 * in full: only player-caused modifications are persisted.
 */

export interface ChunkCoord {
	cx: number;
	cy: number;
}

export interface ChunkResourceNode {
	/** Stable id: `${biome}_${cx}_${cy}_${index}` — survives save/load. */
	instanceId: string;
	nodeTypeId: string;
	/** World-space pixel position. */
	x: number;
	y: number;
	biome: string;
}

export interface ChunkData {
	coord: ChunkCoord;
	/** Dominant biome of the chunk (per-tile biome is derived when rendering). */
	biome: BiomeDefinition;
	nodes: ChunkResourceNode[];
	seed: number;
}

export function chunkKey(cx: number, cy: number): string {
	return `${cx},${cy}`;
}

export class ChunkManager {
	readonly worldSeed: number;
	readonly chunkSizeTiles: number;
	readonly tileSize: number;
	readonly chunksX: number;
	readonly chunksY: number;

	private cache = new Map<string, ChunkData>();
	private active = new Set<string>();
	/** 256px-cell jitter memo, keyed by "<nx>,<ny>" (biomeAt is called per frame). */
	private jitterCache = new Map<string, number>();

	constructor(worldSeed: number) {
		this.worldSeed = worldSeed >>> 0;
		this.chunkSizeTiles = BALANCE.world.chunkSizeTiles;
		this.tileSize = BALANCE.world.tileSize;
		this.chunksX = BALANCE.world.worldChunksX;
		this.chunksY = BALANCE.world.worldChunksY;
	}

	get pixelWidth(): number {
		return this.chunksX * this.chunkSizeTiles * this.tileSize;
	}

	get pixelHeight(): number {
		return this.chunksY * this.chunkSizeTiles * this.tileSize;
	}

	/**
	 * "Inwardness" of a world point: 0 at the island edge, 1 at the centre.
	 * Biome bands are defined from the centre outward, so the tropical coast
	 * occupies the outer ring and the highlands the inner core.
	 */
	private normalizedCenterDistance(x: number, y: number): number {
		const cx = this.pixelWidth / 2;
		const cy = this.pixelHeight / 2;
		const half = Math.min(this.pixelWidth, this.pixelHeight) / 2;
		const outward = Math.min(1, Math.hypot(x - cx, y - cy) / half);
		return 1 - outward; // 1 at centre, 0 at edge
	}

	/** Biome at a world position, deterministically (with seeded edge jitter). */
	biomeAt(x: number, y: number): BiomeDefinition {
		// Seeded low-frequency jitter to give the biome borders organic shape.
		const nx = Math.floor(x / 256);
		const ny = Math.floor(y / 256);
		const jitter = this.cellJitter(nx, ny);
		const d = this.normalizedCenterDistance(x, y) + jitter;

		let chosen = BIOMES.tropical_coast;
		for (const b of BIOME_LIST) {
			if (d >= b.startRadius) chosen = b;
		}
		return chosen;
	}

	/**
	 * Ground colour at a world point, softly blended across biome borders.
	 *
	 * `biomeAt` snaps to whichever band's radius the point falls in, which makes
	 * the border a hard line. Here the two nearest bands are blended by how close
	 * `d` sits to the boundary (within `blend` of it), so coast↔rainforest and
	 * rainforest↔highlands fade into one another instead of showing a seam.
	 * Pure function of the world position → chunk textures stay seamless.
	 */
	groundTintAt(x: number, y: number, blend = 0.06): number {
		const nx = Math.floor(x / 256);
		const ny = Math.floor(y / 256);
		const d = this.normalizedCenterDistance(x, y) + this.cellJitter(nx, ny);

		// Sorted by startRadius ascending (BIOME_LIST is authored that way).
		const bands = BIOME_LIST;
		let lower = bands[0];
		let upper: BiomeDefinition | null = null;
		for (let i = 0; i < bands.length; i++) {
			if (d >= bands[i].startRadius) {
				lower = bands[i];
				upper = bands[i + 1] ?? null;
			}
		}
		if (upper && upper.startRadius - d < blend) {
			const t = 1 - (upper.startRadius - d) / blend; // 0 at edge, 1 past
			return mixHex(lower.groundColor, upper.groundColor, t * 0.5);
		}
		return lower.groundColor;
	}

	/**
	 * Deterministic jitter for a 256px cell, memoized. `biomeAt` is on the
	 * per-frame hot path (biome band checks + wildlife spawn), and recomputing the
	 * hash + PRNG each call is pure waste, so cache it per cell.
	 */
	private cellJitter(nx: number, ny: number): number {
		const key = `${nx},${ny}`;
		const cached = this.jitterCache.get(key);
		if (cached !== undefined) return cached;
		const jrng = mulberry32((this.worldSeed ^ hashString(key)) >>> 0);
		const jitter = (jrng() - 0.5) * 0.08;
		// Bound the memo so roaming the whole island cannot grow it unbounded.
		if (this.jitterCache.size > 4096) this.jitterCache.clear();
		this.jitterCache.set(key, jitter);
		return jitter;
	}

	/** Convert a world pixel position to a chunk coordinate. */
	worldToChunk(x: number, y: number): ChunkCoord {
		const chunkPx = this.chunkSizeTiles * this.tileSize;
		return { cx: Math.floor(x / chunkPx), cy: Math.floor(y / chunkPx) };
	}

	inBounds(coord: ChunkCoord): boolean {
		return coord.cx >= 0 && coord.cy >= 0 && coord.cx < this.chunksX && coord.cy < this.chunksY;
	}

	/**
	 * Deterministically build (or fetch from cache) a chunk. Same seed + coord
	 * ALWAYS yields identical nodes (unit-tested).
	 */
	getChunk(coord: ChunkCoord): ChunkData {
		const key = chunkKey(coord.cx, coord.cy);
		const cached = this.cache.get(key);
		if (cached) return cached;

		const chunkPx = this.chunkSizeTiles * this.tileSize;
		const originX = coord.cx * chunkPx;
		const originY = coord.cy * chunkPx;
		const seed = (this.worldSeed ^ hashString(key)) >>> 0;
		const rng = mulberry32(seed);

		// Dominant biome = biome at the chunk centre.
		const biome = this.biomeAt(originX + chunkPx / 2, originY + chunkPx / 2);

		const nodes: ChunkResourceNode[] = [];
		const weights = biome.resourceWeights;
		const types = Object.keys(weights);
		const total = types.reduce((a, t) => a + weights[t], 0);
		// Node density scales with chunk area but stays deterministic. Range is a
		// BALANCE tunable so the island can be made busier/sparser without code.
		const { nodeDensityMin, nodeDensityMax } = BALANCE.world;
		const count = nodeDensityMin + Math.floor(rng() * (nodeDensityMax - nodeDensityMin + 1));
		const occupied: { x: number; y: number }[] = [];
		let attempts = 0;
		let placed = 0;
		while (placed < count && attempts < count * 25) {
			attempts++;
			const x = originX + 40 + rng() * (chunkPx - 80);
			const y = originY + 40 + rng() * (chunkPx - 80);
			if (occupied.some((p) => Math.hypot(p.x - x, p.y - y) < BALANCE.world.nodeMinSpacing))
				continue;
			occupied.push({ x, y });

			// Weighted pick.
			let roll = rng() * total;
			let picked = types[0];
			for (const t of types) {
				roll -= weights[t];
				if (roll <= 0) {
					picked = t;
					break;
				}
			}
			if (!getResourceNode(picked)) continue;
			nodes.push({
				instanceId: `${picked}_${coord.cx}_${coord.cy}_${placed}`,
				nodeTypeId: picked,
				x,
				y,
				biome: biome.id
			});
			placed++;
		}

		const data: ChunkData = { coord, biome, nodes, seed };
		this.cache.set(key, data);
		return data;
	}

	/**
	 * Update the active chunk set around the player and return the chunks that
	 * entered the active radius. Distant chunks are dropped from the active set
	 * (their data stays cached; the cache is LRU-capped).
	 */
	updateActive(playerX: number, playerY: number): { entered: ChunkData[]; exited: ChunkCoord[] } {
		const center = this.worldToChunk(playerX, playerY);
		const radius = BALANCE.world.activeRadiusChunks;
		const next = new Set<string>();
		const entered: ChunkData[] = [];

		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const coord = { cx: center.cx + dx, cy: center.cy + dy };
				if (!this.inBounds(coord)) continue;
				const key = chunkKey(coord.cx, coord.cy);
				next.add(key);
				if (!this.active.has(key)) entered.push(this.getChunk(coord));
			}
		}

		const exited: ChunkCoord[] = [];
		for (const key of this.active) {
			if (!next.has(key)) {
				const [cx, cy] = key.split(',').map(Number);
				exited.push({ cx, cy });
			}
		}
		this.active = next;
		this.trimCache();
		return { entered, exited };
	}

	getActiveKeys(): string[] {
		return [...this.active];
	}

	isActive(cx: number, cy: number): boolean {
		return this.active.has(chunkKey(cx, cy));
	}

	/** Keep the cache bounded to avoid unbounded memory growth (see §42). */
	private trimCache(maxChunks = 256): void {
		if (this.cache.size <= maxChunks) return;
		// Evict keys not currently active (Map preserves insertion order).
		for (const key of this.cache.keys()) {
			if (this.cache.size <= maxChunks) break;
			if (!this.active.has(key)) this.cache.delete(key);
		}
	}

	clear(): void {
		this.cache.clear();
		this.active.clear();
		this.jitterCache.clear();
	}
}
