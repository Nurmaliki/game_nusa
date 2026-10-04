import type { BuildingDefinition } from '$data/buildings';
import type { ItemStack } from '$types/items';
import type { Vec2 } from '$types/core';
import { BALANCE } from '../config/balance';
import type { Inventory } from '../core/inventory';

/**
 * Pure building placement validation (see §18 / §60).
 */
export interface PlacementContext {
	/** Player position (must be within placementRange). */
	playerPos: Vec2;
	/** Candidate placement position (world px). */
	position: Vec2;
	/** Footprint in tiles -> converted to px for collision checks. */
	tileSize: number;
	/** Positions+radii of existing solid objects to avoid. */
	occupied: { pos: Vec2; radius: number }[];
	/** Resource node positions to avoid (min spacing). */
	resourceNodes: Vec2[];
	/** Terrain validity callback (e.g. not water unless nearWater). */
	isTerrainValid: (pos: Vec2, def: BuildingDefinition) => boolean;
	inventory: Inventory;
	/** Player skill levels, for unlocking gated buildings. */
	skills?: Record<string, number>;
}

export type PlacementIssue =
	| 'out_of_range'
	| 'invalid_terrain'
	| 'blocked'
	| 'too_close_to_resource'
	| 'missing_materials'
	| 'locked';

export interface PlacementResult {
	valid: boolean;
	issues: PlacementIssue[];
	missing: ItemStack[];
}

/**
 * Player-facing Indonesian copy for each placement issue. Kept next to the
 * issue union so a new issue code can never ship without a human-readable
 * message (the UI must never show raw codes like `out_of_range`).
 */
export const PLACEMENT_ISSUE_TEXT: Record<PlacementIssue, string> = {
	out_of_range: 'Terlalu jauh dari kamu',
	invalid_terrain: 'Tanah di sini tidak bisa dibangun',
	blocked: 'Sudah ada bangunan di sini',
	too_close_to_resource: 'Terlalu dekat dengan tumbuhan/batu',
	missing_materials: 'Bahan tidak cukup',
	locked: 'Belum terbuka'
};

/** Format one or more placement issues as a readable Indonesian sentence. */
export function describePlacementIssues(issues: PlacementIssue[]): string {
	const seen = new Set<PlacementIssue>();
	const parts: string[] = [];
	for (const issue of issues) {
		if (seen.has(issue)) continue;
		seen.add(issue);
		parts.push(PLACEMENT_ISSUE_TEXT[issue]);
	}
	return parts.join(' · ');
}

export function validatePlacement(def: BuildingDefinition, ctx: PlacementContext): PlacementResult {
	const issues: PlacementIssue[] = [];

	// Unlock gate (e.g. skill level).
	if (def.unlock?.skill) {
		const level = ctx.skills?.[def.unlock.skill.id] ?? 0;
		if (level < def.unlock.skill.level) issues.push('locked');
	}

	const d = Math.hypot(ctx.position.x - ctx.playerPos.x, ctx.position.y - ctx.playerPos.y);
	if (d > BALANCE.building.placementRange) issues.push('out_of_range');

	if (!ctx.isTerrainValid(ctx.position, def)) issues.push('invalid_terrain');

	const halfW = (def.size.w * ctx.tileSize) / 2;
	const halfH = (def.size.h * ctx.tileSize) / 2;
	const footprintRadius = Math.hypot(halfW, halfH);

	for (const occ of ctx.occupied) {
		const dist = Math.hypot(occ.pos.x - ctx.position.x, occ.pos.y - ctx.position.y);
		if (dist < footprintRadius + occ.radius) {
			issues.push('blocked');
			break;
		}
	}

	for (const node of ctx.resourceNodes) {
		const dist = Math.hypot(node.x - ctx.position.x, node.y - ctx.position.y);
		if (dist < BALANCE.building.minSpacingToResource) {
			issues.push('too_close_to_resource');
			break;
		}
	}

	const missing: ItemStack[] = [];
	for (const req of def.requires) {
		const have = ctx.inventory.count(req.id);
		if (have < req.qty) missing.push({ id: req.id, qty: req.qty - have });
	}
	if (missing.length > 0) issues.push('missing_materials');

	return { valid: issues.length === 0, issues, missing };
}
