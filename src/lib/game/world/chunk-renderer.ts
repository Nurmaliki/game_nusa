import Phaser from 'phaser';
import type { ChunkManager, ChunkData } from './chunk-manager';
import { getResourceNode } from '$data/resources';
import { ensurePlaceholderTextures } from '../core/placeholders';

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
	private groundLayer: Phaser.GameObjects.Graphics;
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
		this.groundLayer = scene.add.graphics().setDepth(0);
		this.harvested = isHarvested;
		ensurePlaceholderTextures(scene);
	}

	/** Draw the ground for a chunk using its dominant biome palette. */
	private drawGround(chunk: ChunkData): void {
		const tile = this.manager.tileSize;
		const size = this.manager.chunkSizeTiles * tile;
		const originX = chunk.coord.cx * size;
		const originY = chunk.coord.cy * size;
		const b = chunk.biome;
		for (let y = 0; y < size; y += tile) {
			for (let x = 0; x < size; x += tile) {
				const odd = (x / tile + y / tile) % 2 === 0;
				this.groundLayer.fillStyle(odd ? b.groundColor : b.groundColorAlt, 1);
				this.groundLayer.fillRect(originX + x, originY + y, tile, tile);
			}
		}
	}

	private spawnChunk(chunk: ChunkData): void {
		const key = `${chunk.coord.cx},${chunk.coord.cy}`;
		if (this.rendered.has(key)) return;
		this.drawGround(chunk);

		const nodes: RenderedNode[] = [];
		for (const node of chunk.nodes) {
			const def = getResourceNode(node.nodeTypeId);
			if (!def) continue;
			const tex = this.scene.textures.exists(def.texture) ? def.texture : 'placeholder_bush';
			const sprite = this.scene.add.image(node.x, node.y, tex).setDepth(5);
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
		if (!nodes) return;
		for (const n of nodes) {
			n.sprite.destroy();
			this.byInstance.delete(n.instanceId);
		}
		this.rendered.delete(key);
		this.nodeCache = null;
		// Ground is drawn into a single graphics layer; a full redraw is cheap at
		// the active radius sizes we use, but to keep it simple and bounded we
		// rebuild the ground layer on chunk churn in Phase 14 if profiling needs it.
	}

	/** Apply an active-set update from the manager. */
	apply(entered: ChunkData[], exited: { cx: number; cy: number }[]): void {
		for (const chunk of entered) this.spawnChunk(chunk);
		for (const coord of exited) this.despawnChunk(`${coord.cx},${coord.cy}`);
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
		this.groundLayer.destroy();
		this.byInstance.clear();
		this.nodeCache = null;
	}
}
