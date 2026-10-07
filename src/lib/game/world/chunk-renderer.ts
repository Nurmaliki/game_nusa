import Phaser from 'phaser';
import type { ChunkManager, ChunkData } from './chunk-manager';
import { getResourceNode } from '$data/resources';
import { BALANCE } from '../config/balance';
import { cellHash, dirtFieldAt, grassToneAt, hubRing, pathCurves } from './terrain';
import { ensurePlaceholderTextures, resourceTexture } from '../core/placeholders';
import { SPRITE_KEYS } from '../core/sprites';
import { coordPhase, swayDegrees } from './animation';

/**
 * Node types that are living vegetation and should sway in the wind. Hard props
 * (rock, ore veins, clay mounds, ruins) are excluded so only plants move.
 */
const SWAYABLE = new Set([
	'tree',
	'palm',
	'hardwood_tree',
	'pine',
	'bamboo_grove',
	'bush',
	'berry_bush',
	'herb_patch',
	'mushroom_patch',
	'rare_plant'
]);

function swayableNodeType(typeId: string): boolean {
	return SWAYABLE.has(typeId);
}

/**
 * Renders the active chunk set as Phaser game objects (see §8 / §41 / §42).
 *
 * - Chunks entering the active radius are drawn (ground + resource sprites).
 * - Chunks leaving are destroyed, freeing textures/objects.
 * - Harvested nodes (from persisted state) are hidden on spawn.
 *
 * The renderer owns NO gameplay state; it reads chunk data + a harvested set.
 */
export interface RenderedNode {
	instanceId: string;
	typeId: string;
	worldX: number;
	worldY: number;
	sprite: Phaser.GameObjects.Image;
	/** Stable sway phase, set only for vegetation (null = static prop). */
	swayPhase: number | null;
}

export class ChunkRenderer {
	private scene: Phaser.Scene;
	private manager: ChunkManager;
	/**
	 * chunkKey -> the Image displaying that chunk's baked ground texture. Each
	 * chunk's ground is drawn once into an offscreen Graphics, baked into a
	 * static texture (`generateTexture`), and the Graphics destroyed. The result
	 * is one static Image per chunk — Phaser uploads it once and never
	 * re-tessellates it, unlike a live Graphics whose thousands of draw commands
	 * were re-processed every frame (the cause of the 5 fps stall).
	 */
	private groundChunks = new Map<string, Phaser.GameObjects.Image>();
	/** chunkKey -> rendered nodes */
	private rendered = new Map<string, RenderedNode[]>();
	/** instanceId -> rendered node (O(1) harvest lookup). */
	private byInstance = new Map<string, RenderedNode>();
	/** Cached flat node list; invalidated whenever chunks enter/leave. */
	private nodeCache: RenderedNode[] | null = null;
	private harvested: (id: string) => boolean;

	constructor(scene: Phaser.Scene, manager: ChunkManager, isHarvested: (id: string) => boolean) {
		this.scene = scene;
		this.manager = manager;
		this.harvested = isHarvested;
		ensurePlaceholderTextures(scene);
	}

	/**
	 * Bake a chunk's ground into a static texture: a biome base, a subtle
	 * per-tile colour wash, then soft organic patches + scattered detail that
	 * cross tile boundaries so the field never shows a hard grid. Drawn once per
	 * chunk lifetime into an offscreen Graphics (local coordinates), baked with
	 * `generateTexture`, then displayed as a single Image.
	 */
	private drawGround(chunk: ChunkData): void {
		const key = `${chunk.coord.cx},${chunk.coord.cy}`;
		if (this.groundChunks.has(key)) return;

		const tile = this.manager.tileSize;
		const size = this.manager.chunkSizeTiles * tile;
		const originX = chunk.coord.cx * size;
		const originY = chunk.coord.cy * size;
		// Offscreen graphics drawn in LOCAL coordinates (0..size), so the baked
		// texture is self-contained and can be placed at the chunk's world X/Y.
		const g = this.scene.make.graphics({ x: 0, y: 0 }, false);

		// Pass 1 — base wash: a very subtle per-tile shade so the field reads as
		// organic rather than a hard grid. The jitter is derived from the WORLD
		// tile coordinate, not the chunk seed, so neighbouring chunks continue
		// seamlessly (a per-chunk seed shifted each chunk's whole tone and made
		// the chunk borders visible).
		for (let y = 0; y < size; y += tile) {
			for (let x = 0; x < size; x += tile) {
				const wx = originX + x;
				const wy = originY + y;
				// Soft biome-blended base colour (no hard seam at band borders).
				const baseColor = this.manager.groundTintAt(wx + tile / 2, wy + tile / 2);
				const tx = wx / tile;
				const ty = wy / tile;
				const jitter = ((tx * 31 + ty * 17) % 7) / 6 - 0.5; // -0.5..0.5
				const base = this.mixColor(
					baseColor,
					jitter < 0
						? this.mixColor(baseColor, 0x000000, 0.14)
						: this.mixColor(baseColor, 0xffffff, 0.12),
					Math.abs(jitter) * 0.5
				);
				g.fillStyle(base, 1);
				g.fillRect(x, y, tile, tile);
			}
		}

		// Pass 2 — soft patches: large overlapping ellipses that straddle tiles,
		// hiding the straight seams between base tiles. Patches live on a WORLD
		// lattice (one candidate per ~1.5 tiles) and are seeded from their world
		// cell, so a patch spanning a chunk border is drawn identically from both
		// chunks — no seam. Their tint is balanced (alternating dark/light) so a
		// chunk never drifts lighter or darker than its neighbour.
		const cell = tile * 1.5;
		const c0 = Math.floor(originX / cell);
		const r0 = Math.floor(originY / cell);
		const c1 = Math.ceil((originX + size) / cell);
		const r1 = Math.ceil((originY + size) / cell);
		for (let cyi = r0; cyi < r1; cyi++) {
			for (let cxi = c0; cxi < c1; cxi++) {
				let h = Math.imul(cxi, 0x27d4eb2d) ^ Math.imul(cyi, 0x165667b1);
				h = (h ^ (h >>> 15)) >>> 0;
				const jx = ((h >>> 3) & 0xff) / 255;
				const jy = ((h >>> 11) & 0xff) / 255;
				const px = (cxi + jx) * cell - originX;
				const py = (cyi + jy) * cell - originY;
				const wx = originX + px;
				const wy = originY + py;
				const baseColor = this.manager.groundTintAt(wx, wy);
				const darker = ((h >>> 19) & 1) === 0;
				const tone = this.mixColor(
					baseColor,
					darker
						? this.mixColor(baseColor, 0x000000, 0.16)
						: this.mixColor(baseColor, 0xffffff, 0.16),
					0.5
				);
				const rx = tile * (0.7 + (((h >>> 21) & 0x7) / 7) * 1.0);
				const ry = tile * (0.5 + (((h >>> 24) & 0x7) / 7) * 0.7);
				g.fillStyle(tone, 0.3);
				g.fillEllipse(px, py, rx * 2, ry * 2);
			}
		}

		// Pass 3 — detail: scattered blades / grains / rocks. Seeded from the
		// WORLD tile coordinate (marks stay inside their tile) so the pattern is
		// identical however the chunk is reached, with no visible chunk bias.
		for (let y = 0; y < size; y += tile) {
			for (let x = 0; x < size; x += tile) {
				const base = this.manager.groundTintAt(originX + x + tile / 2, originY + y + tile / 2);
				const tx = (originX + x) / tile;
				const ty = (originY + y) / tile;
				let detailSeed = (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 0;
				detailSeed = (detailSeed ^ (detailSeed >>> 13)) >>> 0;
				const accent = this.mixColor(base, 0x000000, 0.22);
				const light = this.mixColor(base, 0xffffff, 0.14);
				const marks = 5 + (detailSeed & 0x3);
				for (let i = 0; i < marks; i++) {
					const h = (detailSeed >>> (i * 4)) & 0x3f;
					const dx = h % tile;
					const dy = ((detailSeed >>> (i * 3)) ^ (h * 13)) % tile;
					const kind = (h ^ i) & 0x3;
					g.fillStyle(i % 2 === 0 ? accent : light, 0.8);
					if (kind === 0) g.fillRect(x + dx, y + dy, 1, 3);
					else if (kind === 1) g.fillRect(x + dx, y + dy, 2, 1);
					else if (kind === 2) g.fillRect(x + dx, y + dy, 1, 1);
					else g.fillRect(x + dx, y + dy, 2, 2);
				}
			}
		}

		// Pass 4 — grass tufts: small clusters of upward blades that read as
		// clumped grass, breaking up any remaining flatness. Seeded from the
		// world cell so tufts tile seamlessly across chunk borders.
		const tuftCell = tile * 3;
		const tc0 = Math.floor(originX / tuftCell);
		const tr0 = Math.floor(originY / tuftCell);
		const tc1 = Math.ceil((originX + size) / tuftCell);
		const tr1 = Math.ceil((originY + size) / tuftCell);
		for (let ti = tr0; ti < tr1; ti++) {
			for (let tj = tc0; tj < tc1; tj++) {
				let th = (Math.imul(tj, 0x9e3779b1) ^ Math.imul(ti, 0x85ebca77)) >>> 0;
				th = (th ^ (th >>> 13)) >>> 0;
				if (th & 0x3) continue; // sparse: ~1 in 4 cells has a tuft
				const jx = ((th >>> 5) & 0xff) / 255;
				const jy = ((th >>> 13) & 0xff) / 255;
				const px = (tj + jx) * tuftCell - originX;
				const py = (ti + jy) * tuftCell - originY;
				const base = this.manager.groundTintAt(originX + px, originY + py);
				const dark = this.mixColor(base, 0x000000, 0.32);
				const lit = this.mixColor(base, 0xffffff, 0.2);
				const blades = 3 + (th & 0x3);
				for (let b = 0; b < blades; b++) {
					const bh = (th >>> (b * 3 + 2)) & 0x7;
					const bx = px + (bh - 4) * 1.5;
					const by = py - (bh & 1);
					const hgt = 3 + ((th >>> (b + 1)) & 0x3);
					g.fillStyle(b % 2 === 0 ? dark : lit, 0.7);
					g.fillRect(bx, by - hgt, 1, hgt + 1);
				}
			}
		}

		// Pass 5 — wildflower clusters: small petalled daisies that add the cozy
		// splash of colour of a farm-life meadow. Seeded from a coarse world cell
		// so they tile seamlessly and stay sparse (never a carpet).
		const flowerCell = tile * 4;
		const fc0 = Math.floor(originX / flowerCell);
		const fr0 = Math.floor(originY / flowerCell);
		const fc1 = Math.ceil((originX + size) / flowerCell);
		const fr1 = Math.ceil((originY + size) / flowerCell);
		const palette = [0xf4e07a, 0xf0a6c0, 0xa8d8f0, 0xf28d7a];
		for (let fi = fr0; fi < fr1; fi++) {
			for (let fj = fc0; fj < fc1; fj++) {
				let fh = (Math.imul(fj, 0x2545f491) ^ Math.imul(fi, 0x9e3779b1)) >>> 0;
				fh = (fh ^ (fh >>> 15)) >>> 0;
				// ~1 in 3 cells gets a little clump of 2–4 blossoms.
				if (fh % 3 !== 0) continue;
				const jx = ((fh >>> 3) & 0xff) / 255;
				const jy = ((fh >>> 11) & 0xff) / 255;
				const cx = (fj + jx) * flowerCell - originX;
				const cy = (fi + jy) * flowerCell - originY;
				const count = 2 + ((fh >>> 19) & 0x3);
				for (let b = 0; b < count; b++) {
					const bh = (fh >>> (b * 5 + 2)) & 0x3f;
					const bx = cx + ((bh % 13) - 6) * 2;
					const by = cy + (((bh >>> 2) % 11) - 5) * 2;
					const petal = palette[bh % palette.length];
					// A soft shadow, a green stem, then a bright 5-pixel bloom.
					g.fillStyle(0x000000, 0.14);
					g.fillEllipse(bx, by + 2, 6, 2.5);
					g.fillStyle(0x3f7a3a, 0.9);
					g.fillRect(bx, by, 1, 3);
					g.fillStyle(petal, 0.95);
					g.fillRect(bx - 2, by - 1, 5, 3);
					g.fillRect(bx - 1, by - 2, 3, 5);
					g.fillStyle(0xfff6d8, 1);
					g.fillRect(bx - 1, by - 1, 3, 3);
					g.fillStyle(0xf0b23c, 1);
					g.fillRect(bx, by, 1, 1);
				}
			}
		}

		// Pass 6 — pebbles / twigs: occasional tiny props that give the ground
		// tactile variation without competing with resource sprites.
		const pebbleCell = tile * 5;
		const pc0 = Math.floor(originX / pebbleCell);
		const pr0 = Math.floor(originY / pebbleCell);
		const pc1 = Math.ceil((originX + size) / pebbleCell);
		const pr1 = Math.ceil((originY + size) / pebbleCell);
		for (let pi = pr0; pi < pr1; pi++) {
			for (let pj = pc0; pj < pc1; pj++) {
				let ph = (Math.imul(pj, 0x27d4eb2f) ^ Math.imul(pi, 0x165667b1)) >>> 0;
				ph = (ph ^ (ph >>> 13)) >>> 0;
				if (ph % 2 !== 0) continue;
				const jx = ((ph >>> 5) & 0xff) / 255;
				const jy = ((ph >>> 13) & 0xff) / 255;
				const px = (pj + jx) * pebbleCell - originX;
				const py = (pi + jy) * pebbleCell - originY;
				const base = this.manager.groundTintAt(originX + px, originY + py);
				const grey = this.mixColor(base, 0x8a8578, 0.7);
				const dark = this.mixColor(grey, 0x000000, 0.35);
				g.fillStyle(0x000000, 0.16);
				g.fillEllipse(px, py + 2, 7, 2.6);
				g.fillStyle(dark, 1);
				g.fillEllipse(px, py, 6, 4);
				g.fillStyle(grey, 1);
				g.fillEllipse(px - 0.5, py - 0.5, 4, 2.6);
			}
		}

		// Pass 7 — grass-tone patches: large, soft light/dark ellipses on a jittered
		// world lattice give the meadow natural tonal variation instead of one flat
		// green. Seeded from world coords (seamless across chunks).
		//
		// The lattice range is EXPANDED by a margin so an ellipse whose centre is
		// just outside this chunk is still drawn (and drawn identically by the
		// neighbour who owns that cell) — otherwise the cut-off ellipse leaves a
		// hard seam at the chunk border.
		const tonCell = 90;
		const tonMargin = tonCell * 2; // covers the largest radius (1.05·cell) + slack
		const t0 = Math.floor((originX - tonMargin) / tonCell);
		const s0 = Math.floor((originY - tonMargin) / tonCell);
		const t1 = Math.ceil((originX + size + tonMargin) / tonCell);
		const s1 = Math.ceil((originY + size + tonMargin) / tonCell);
		for (let sy = s0; sy < s1; sy++) {
			for (let sx = t0; sx < t1; sx++) {
				const h = cellHash(this.manager.worldSeed ^ 0x0a1b2c3d, sx, sy);
				if (h < 0.18) continue; // leave some cells plain
				const jx = cellHash(this.manager.worldSeed ^ 0x1a2b, sx, sy);
				const jy = cellHash(this.manager.worldSeed ^ 0x3c4d, sy, sx);
				const px = (sx + jx) * tonCell - originX;
				const py = (sy + jy) * tonCell - originY;
				const wx = originX + px;
				const wy = originY + py;
				const tone = grassToneAt(this.manager.worldSeed, wx, wy);
				const base = this.manager.groundTintAt(wx, wy);
				const col =
					tone < 0.5
						? this.mixColor(base, 0x1c3a24, (0.5 - tone) * 0.7)
						: this.mixColor(base, 0xc2e08a, (tone - 0.5) * 0.55);
				const r = tonCell * (0.55 + h * 0.5);
				g.fillStyle(col, 0.22);
				g.fillEllipse(px, py, r * 2, r * 1.6);
			}
		}

		// Pass 8 — bare earth: soft dirt pockets where the grass thins to soil.
		// Range expanded like the tone pass so border-crossing blobs line up.
		const dirtCell = 70;
		const dirtMargin = dirtCell * 2;
		const dc0 = Math.floor((originX - dirtMargin) / dirtCell);
		const dr0 = Math.floor((originY - dirtMargin) / dirtCell);
		const dc1 = Math.ceil((originX + size + dirtMargin) / dirtCell);
		const dr1 = Math.ceil((originY + size + dirtMargin) / dirtCell);
		for (let dr = dr0; dr < dr1; dr++) {
			for (let dc = dc0; dc < dc1; dc++) {
				const jx = cellHash(this.manager.worldSeed ^ 0x5e6f, dc, dr);
				const jy = cellHash(this.manager.worldSeed ^ 0x7a8b, dr, dc);
				const px = (dc + jx) * dirtCell - originX;
				const py = (dr + jy) * dirtCell - originY;
				const wx = originX + px;
				const wy = originY + py;
				const dirt = dirtFieldAt(this.manager.worldSeed, wx, wy);
				if (dirt <= 0.05) continue;
				const base = this.manager.groundTintAt(wx, wy);
				const soil = this.mixColor(base, 0x6b4a2c, 0.5 + dirt * 0.4);
				const r = dirtCell * (0.28 + jx * 0.32);
				g.fillStyle(soil, Math.min(0.6, 0.2 + dirt * 0.5));
				g.fillEllipse(px, py, r * 2.2, r * 1.7);
				// A darker inner dapple for a dug-out centre.
				if (dirt > 0.55) {
					g.fillStyle(this.mixColor(soil, 0x2c1c10, 0.45), 0.4);
					g.fillEllipse(px, py + 1, r * 1.05, r * 0.75);
				}
			}
		}

		// Pass 9 — trails: smooth winding dirt paths drawn as stroked curves, with a
		// wider lighter gravel band underneath for a soft grass→path transition.
		this.drawPaths(g, originX, originY);

		// Bake to a static texture, then drop the graphics. The texture key is
		// unique per chunk so re-entering a chunk reuses the same layout.
		//
		// Memory: a full-res bake is 1024² (~4 MB) per chunk, and ~25 live chunks
		// would hold ~100 MB of VRAM — too much for low-end mobile. We bake into a
		// scratch canvas at full resolution, then downscale-blit once into a
		// smaller canvas texture (see BALANCE.world.groundBakeScale). The blit is
		// done by us (generateTexture ignores graphics transforms), so the drawing
		// math above stays in exact world coordinates and remains seamless.
		const texKey = `ground_${key}`;
		const bakeScale = BALANCE.world.groundBakeScale;
		if (bakeScale >= 1) {
			g.generateTexture(texKey, size, size);
		} else {
			const outSize = Math.max(1, Math.round(size * bakeScale));
			const scratch = document.createElement('canvas');
			scratch.width = size;
			scratch.height = size;
			// generateTexture accepts a canvas key and draws into it 1:1.
			g.generateTexture(scratch, size, size);
			const out = document.createElement('canvas');
			out.width = outSize;
			out.height = outSize;
			const octx = out.getContext('2d');
			if (octx) {
				octx.imageSmoothingEnabled = true;
				octx.drawImage(scratch, 0, 0, size, size, 0, 0, outSize, outSize);
			}
			this.scene.textures.addCanvas(texKey, out);
		}
		g.destroy();
		const image = this.scene.add.image(originX, originY, texKey).setOrigin(0, 0).setDepth(-10000);
		// Stretch the (possibly downscaled) bake back to the chunk's true size.
		image.setDisplaySize(size, size);
		this.groundChunks.set(key, image);
	}

	/**
	 * Stroke the island's trails onto a chunk's ground graphics, in LOCAL
	 * coordinates. A wide light gravel band is drawn first, then a narrower
	 * packed-earth centre on top, giving a soft grass→gravel→earth transition.
	 * Only a rough bounding check skips work for far-away chunks.
	 */
	private drawPaths(g: Phaser.GameObjects.Graphics, originX: number, originY: number): void {
		const w = this.manager.pixelWidth;
		const h = this.manager.pixelHeight;
		const curves = pathCurves(this.manager.worldSeed, w, h);
		const ring = hubRing(w, h);

		// Local conversion helper.
		const toLocal = (p: { x: number; y: number }) =>
			new Phaser.Math.Vector2(p.x - originX, p.y - originY);

		// Gravel underlay (wider, lighter), then earth core for each curve.
		for (const curve of curves) {
			const pts = curve.points.map(toLocal);
			g.lineStyle(curve.width + 10, 0xc2a074, 0.5);
			g.strokePoints(pts, false, false);
			g.lineStyle(curve.width, 0x7d5730, 0.9);
			g.strokePoints(pts, false, false);
		}

		// Hub ring: a smooth circle trail near the southern coast.
		const rcx = ring.cx - originX;
		const rcy = ring.cy - originY;
		g.lineStyle(ring.width + 10, 0xc2a074, 0.5);
		g.strokeCircle(rcx, rcy, ring.r);
		g.lineStyle(ring.width, 0x7d5730, 0.9);
		g.strokeCircle(rcx, rcy, ring.r);
	}

	/** Blend two 0xRRGGBB colours; t=0 → a, t=1 → b. */
	private mixColor(a: number, b: number, t: number): number {
		const ar = (a >> 16) & 0xff;
		const ag = (a >> 8) & 0xff;
		const ab = a & 0xff;
		const br = (b >> 16) & 0xff;
		const bg = (b >> 8) & 0xff;
		const bb = b & 0xff;
		const r = Math.round(ar + (br - ar) * t);
		const gr = Math.round(ag + (bg - ag) * t);
		const bl = Math.round(ab + (bb - ab) * t);
		return (r << 16) | (gr << 8) | bl;
	}

	private spawnChunk(chunk: ChunkData): void {
		const key = `${chunk.coord.cx},${chunk.coord.cy}`;
		if (this.rendered.has(key)) return;

		const nodes: RenderedNode[] = [];
		const scaleMap = BALANCE.world.nodeSpriteScale;
		for (const node of chunk.nodes) {
			const def = getResourceNode(node.nodeTypeId);
			if (!def) continue;
			const tex = resourceTexture(node.nodeTypeId);
			const sprite = this.scene.add
				.image(node.x, node.y, this.scene.textures.exists(tex) ? tex : SPRITE_KEYS.bush)
				.setOrigin(0.5, 0.8)
				.setDepth(node.y);
			// Landmark props are scaled up so the world reads as populated; the
			// origin (0.5, 0.8) keeps the sprite's base planted on the node's Y.
			const scale = scaleMap[node.nodeTypeId] ?? scaleMap.default ?? 1;
			if (scale !== 1) sprite.setScale(scale);
			if (this.harvested(node.instanceId)) sprite.setVisible(false);
			const rendered: RenderedNode = {
				instanceId: node.instanceId,
				typeId: node.nodeTypeId,
				worldX: node.x,
				worldY: node.y,
				sprite,
				// Vegetation rustles in the wind; hard props (rock/ore/mound) stay put.
				swayPhase: swayableNodeType(node.nodeTypeId) ? coordPhase(node.x, node.y) : null
			};
			nodes.push(rendered);
			this.byInstance.set(node.instanceId, rendered);
		}
		this.rendered.set(key, nodes);
		this.nodeCache = null;
	}

	private despawnChunk(key: string): void {
		const nodes = this.rendered.get(key);
		if (nodes) {
			for (const n of nodes) {
				n.sprite.destroy();
				this.byInstance.delete(n.instanceId);
			}
			this.rendered.delete(key);
			this.nodeCache = null;
		}
		const ground = this.groundChunks.get(key);
		if (ground) {
			ground.destroy();
			// Free the baked texture too — otherwise the texture manager grows
			// without bound as the player explores and chunks churn.
			if (this.scene.textures.exists(`ground_${key}`)) this.scene.textures.remove(`ground_${key}`);
			this.groundChunks.delete(key);
		}
	}

	/** Apply an active-set update from the manager. */
	apply(entered: ChunkData[], exited: { cx: number; cy: number }[]): void {
		for (const chunk of entered) {
			this.spawnChunk(chunk);
		}
		for (const coord of exited) this.despawnChunk(`${coord.cx},${coord.cy}`);
		// Ground is baked per chunk on entry, so additions and removals are both
		// O(changed chunks) — no full-layer repaint is ever needed.
		for (const chunk of entered) this.drawGround(chunk);
	}

	/**
	 * All currently rendered nodes (used for interaction queries). The flat list
	 * is cached and only rebuilt when the active chunk set changes, so per-frame
	 * callers (build preview, interaction probe) do no allocation.
	 */
	activeNodes(): RenderedNode[] {
		if (this.nodeCache) return this.nodeCache;
		const out: RenderedNode[] = [];
		for (const nodes of this.rendered.values()) out.push(...nodes);
		this.nodeCache = out;
		return out;
	}

	/** Hide a node's sprite after it is fully harvested (O(1) lookup). */
	markHarvested(instanceId: string): void {
		this.byInstance.get(instanceId)?.sprite.setVisible(false);
	}

	/**
	 * Apply the wind sway to living vegetation (see §19). O(active nodes) and
	 * skipped when the player prefers reduced motion. Rocks/ore are untouched so
	 * only plants move, and each plant sways on its own stable phase.
	 */
	animate(timeMs: number, reducedMotion: boolean): void {
		if (reducedMotion) return;
		const amp = BALANCE.feedback.swayAmpDeg;
		for (const node of this.activeNodes()) {
			if (node.swayPhase === null) continue;
			if (!node.sprite.visible) continue;
			node.sprite.setAngle(swayDegrees(timeMs, node.swayPhase, amp));
		}
	}

	destroy(): void {
		for (const key of [...this.rendered.keys()]) this.despawnChunk(key);
		for (const key of [...this.groundChunks.keys()]) this.despawnChunk(key);
		this.byInstance.clear();
		this.nodeCache = null;
	}
}
