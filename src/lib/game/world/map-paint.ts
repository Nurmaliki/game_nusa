import type { ChunkManager } from './chunk-manager';
import { BIOMES } from '$data/biomes';

/**
 * Pure world-map painting for the DOM (see § UI map).
 *
 * Renders the whole island's biome field onto a 2D canvas by sampling the same
 * `groundTintAt` used by the in-world ground, so the map reads as a faithful
 * miniature of the world. No Phaser dependency — the map is plain canvas 2D.
 *
 * The result is deterministic: a given (ChunkManager seed, size) always paints
 * the same island, so the minimap and the full map agree pixel-for-pixel.
 */

export interface MapPaintOptions {
	/** Output square size in CSS pixels (the canvas backing store scales it). */
	size: number;
	/** Device pixel ratio for crisp rendering (defaults to 1). */
	dpr?: number;
	/** How many samples across each axis. Lower = chunkier, faster. */
	resolution?: number;
}

export interface MapMarker {
	/** World-space pixel position. */
	x: number;
	y: number;
	/** 0xRRGGBB fill. */
	color?: string;
	/** Draw a small ring around the dot. */
	ring?: boolean;
}

export interface MapBuildingMark {
	x: number;
	y: number;
}

export interface MapRenderInput {
	manager: ChunkManager;
	player?: MapMarker;
	buildings?: MapBuildingMark[];
	worldWidth: number;
	worldHeight: number;
}

/** Convert a 0xRRGGBB int to a `#rrggbb` CSS string. */
export function hex(color: number): string {
	return `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
}

/**
 * Brighten + slightly saturate an 0xRRGGBB colour so the flat world-ground
 * tones read as a friendlier illustrated map. `lift` is a 0..1 blend toward a
 * warm white and `gain` scales the distance from mid-grey.
 */
export function vivid(color: number, lift = 0.14, gain = 1.18): number {
	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;
	const boost = (c: number) => {
		const centred = 128 + (c - 128) * gain;
		const lit = centred + (255 - centred) * lift;
		return Math.max(0, Math.min(255, Math.round(lit)));
	};
	return (boost(r) << 16) | (boost(g) << 8) | boost(b);
}

/**
 * Paint the island biome field into `ctx`. `ctx` is assumed pre-scaled so that
 * drawing in a `size`×`size` box fills the canvas. Returns nothing; callers
 * draw markers afterwards.
 */
export function paintIsland(
	ctx: CanvasRenderingContext2D,
	manager: ChunkManager,
	{ size, resolution = 64 }: MapPaintOptions
): void {
	const cell = size / resolution;
	// The island is not a perfect square in world space; sample by fraction so
	// the miniature keeps the world's aspect regardless of chunk counts.
	for (let j = 0; j < resolution; j++) {
		for (let i = 0; i < resolution; i++) {
			const fx = (i + 0.5) / resolution;
			const fy = (j + 0.5) / resolution;
			const wx = fx * manager.pixelWidth;
			const wy = fy * manager.pixelHeight;
			ctx.fillStyle = hex(vivid(manager.groundTintAt(wx, wy)));
			// +1 overlap avoids hairline seams between samples.
			ctx.fillRect(i * cell, j * cell, cell + 1, cell + 1);
		}
	}
}

/**
 * Draw a soft rounded landmass mask so the island reads as an island floating
 * on water rather than a square swatch. Everything outside the island's
 * circular coast is painted as sea.
 */
export function paintSea(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.fillStyle = '#2a6d86';
	ctx.fillRect(0, 0, size, size);
}

/**
 * Clip drawing to the island disc (matching `normalizedCenterDistance`, whose
 * edge is the max-radius circle inscribed in the square). Callers should
 * `save()` before and `restore()` after.
 */
export function islandClip(ctx: CanvasRenderingContext2D, size: number): void {
	const cx = size / 2;
	const cy = size / 2;
	const r = size / 2;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.clip();
}

/** Paint a full island map (sea → island → optional border) in one call. */
export function paintWorldMap(
	ctx: CanvasRenderingContext2D,
	input: MapRenderInput,
	opts: MapPaintOptions
): void {
	const { size } = opts;
	paintSea(ctx, size);
	ctx.save();
	islandClip(ctx, size);
	paintIsland(ctx, input.manager, opts);
	ctx.restore();
	// Gentle coast outline.
	ctx.strokeStyle = 'rgba(12, 40, 30, 0.55)';
	ctx.lineWidth = Math.max(1, size * 0.012);
	ctx.beginPath();
	ctx.arc(size / 2, size / 2, size / 2 - ctx.lineWidth / 2, 0, Math.PI * 2);
	ctx.stroke();
}

/** Draw a marker (player/building) at a world position. */
export function drawMarker(
	ctx: CanvasRenderingContext2D,
	marker: MapMarker,
	input: MapRenderInput,
	size: number
): void {
	const fx = marker.x / (input.worldWidth || 1);
	const fy = marker.y / (input.worldHeight || 1);
	const px = fx * size;
	const py = fy * size;
	const r = Math.max(3, size * 0.028);
	if (marker.ring) {
		ctx.beginPath();
		ctx.arc(px, py, r + 2.5, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.fill();
	}
	ctx.beginPath();
	ctx.arc(px, py, r, 0, Math.PI * 2);
	ctx.fillStyle = marker.color ?? '#f7f1e3';
	ctx.fill();
	ctx.lineWidth = Math.max(1, r * 0.5);
	ctx.strokeStyle = 'rgba(20, 12, 6, 0.75)';
	ctx.stroke();
}

/**
 * Legend rows describing the biome bands (for the full map). Pure data derived
 * from the biome definitions so it never drifts from the world.
 */
export function biomeLegend(): { id: string; name: string; color: string }[] {
	return Object.values(BIOMES).map((b) => ({
		id: b.id,
		name: b.name,
		color: hex(vivid(b.groundColor))
	}));
}
