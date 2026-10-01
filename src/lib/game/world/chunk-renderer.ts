import Phaser from 'phaser';
import type { ChunkManager, ChunkData } from './chunk-manager';
import { getResourceNode } from '$data/resources';
import { BALANCE } from '../config/balance';
import { ensurePlaceholderTextures, resourceTexture } from '../core/placeholders';
import { SPRITE_KEYS } from '../core/sprites';

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
				sprite
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

	destroy(): void {
		for (const key of [...this.rendered.keys()]) this.despawnChunk(key);
		for (const key of [...this.groundChunks.keys()]) this.despawnChunk(key);
		this.byInstance.clear();
		this.nodeCache = null;
	}
}
