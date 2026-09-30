import Phaser from 'phaser';
import type { GameState } from '../core/game-state';
import { getBuilding, type BuildingDefinition } from '$data/buildings';
import { validatePlacement, type PlacementContext } from './placement';
import { BALANCE } from '../config/balance';
import { getGameBus } from '../core/event-bus';
import type { Vec2 } from '$types/core';
import type { RenderedNode } from '../world/chunk-renderer';

/**
 * Build-mode controller (see §18 / §31).
 *
 * Owns the placement preview: a ghost sprite that follows the pointer, tinted
 * green (valid) or red (invalid), plus rotation. Commits via GameState using
 * the SAME `validatePlacement` used by the pure layer, so UI and rules agree.
 *
 * The controller is Phaser-aware (it owns a sprite) but delegates ALL rules to
 * the pure `placement` module and `GameState`.
 */
export class BuildController {
	private scene: Phaser.Scene;
	private ghost: Phaser.GameObjects.Rectangle;
	private active = false;
	private definition: BuildingDefinition | null = null;
	private rotation = 0;
	private tileSize: number;

	constructor(scene: Phaser.Scene, tileSize: number) {
		this.scene = scene;
		this.tileSize = tileSize;
		this.ghost = scene.add
			.rectangle(0, 0, tileSize, tileSize, 0x68d391, 0.35)
			.setOrigin(0.5, 0.5)
			.setStrokeStyle(2, 0x2f855a, 1)
			.setDepth(8000)
			.setVisible(false);
	}

	isActive(): boolean {
		return this.active;
	}

	definitionId(): string | null {
		return this.definition?.id ?? null;
	}

	/** Enter build mode for a building definition id. */
	begin(definitionId: string): boolean {
		const def = getBuilding(definitionId);
		if (!def) return false;
		this.definition = def;
		this.active = true;
		this.rotation = 0;
		this.ghost.setVisible(true);
		this.ghost.setSize(def.size.w * this.tileSize, def.size.h * this.tileSize);
		return true;
	}

	/** Leave build mode and hide the preview. */
	cancel(): void {
		this.active = false;
		this.definition = null;
		this.ghost.setVisible(false);
		getGameBus().emit('BUILD_PREVIEW', { valid: null, issues: [] });
	}

	rotate(): void {
		if (!this.definition) return;
		this.rotation = (this.rotation + 90) % 360;
		// Swap footprint for 90/270 rotations.
		const swap = this.rotation === 90 || this.rotation === 270;
		const w = this.definition.size.w;
		const h = this.definition.size.h;
		this.ghost.setSize((swap ? h : w) * this.tileSize, (swap ? w : h) * this.tileSize);
	}

	private contextFor(state: GameState, position: Vec2, nodes: RenderedNode[]): PlacementContext {
		const occupied = state.buildings
			.map((b) => {
				const def = getBuilding(b.definitionId);
				if (!def) return null;
				return {
					pos: b.position,
					radius: (Math.max(def.size.w, def.size.h) * this.tileSize) / 2
				};
			})
			.filter((x): x is { pos: Vec2; radius: number } => x !== null);

		return {
			playerPos: state.player.position,
			position,
			tileSize: this.tileSize,
			occupied,
			resourceNodes: nodes.map((n) => ({ x: n.worldX, y: n.worldY })),
			isTerrainValid: () => true,
			inventory: state.inventory,
			skills: state.skills.toRecord()
		};
	}

	/**
	 * Update the ghost each frame. Returns whether the current placement is
	 * valid. Emits BUILD_PREVIEW so the UI can show reasons.
	 */
	update(state: GameState, pointer: Vec2, nodes: RenderedNode[]): boolean {
		if (!this.active || !this.definition) return false;

		// Snap to the tile grid for a tidy placement feel.
		const snapped: Vec2 = {
			x: Math.round(pointer.x / this.tileSize) * this.tileSize,
			y: Math.round(pointer.y / this.tileSize) * this.tileSize
		};
		this.ghost.setPosition(snapped.x, snapped.y);

		const result = validatePlacement(this.definition, this.contextFor(state, snapped, nodes));
		this.ghost.setFillStyle(result.valid ? 0x68d391 : 0xf56565, 0.4);
		this.ghost.setStrokeStyle(2, result.valid ? 0x2f855a : 0xc53030, 1);

		getGameBus().emit('BUILD_PREVIEW', { valid: result.valid, issues: result.issues });
		return result.valid;
	}

	/**
	 * Commit the current placement if valid. Returns the new building id or null.
	 */
	commit(state: GameState, pointer: Vec2, nodes: RenderedNode[]): string | null {
		if (!this.active || !this.definition) return null;
		const snapped: Vec2 = {
			x: Math.round(pointer.x / this.tileSize) * this.tileSize,
			y: Math.round(pointer.y / this.tileSize) * this.tileSize
		};
		const result = validatePlacement(this.definition, this.contextFor(state, snapped, nodes));
		if (!result.valid) return null;

		const added = state.addBuilding(this.definition.id, snapped, this.definition.requires);
		if (!added.ok) return null;
		getGameBus().emit('BUILD_PLACED', {
			buildingId: added.value.id,
			definitionId: this.definition.id
		});
		return added.value.id;
	}

	/** Sprite size (for tests / diagnostics). */
	ghostBounds(): { w: number; h: number } {
		return { w: this.ghost.width, h: this.ghost.height };
	}

	/** Range from the player within which a build may be confirmed. */
	placementRange(): number {
		return BALANCE.building.placementRange;
	}

	destroy(): void {
		this.ghost.destroy();
	}
}
