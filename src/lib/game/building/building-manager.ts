import type { BuildingDefinition } from '$data/buildings';
import { BUILDING_LIST, getBuilding } from '$data/buildings';
import { BALANCE } from '../config/balance';
import type { Vec2 } from '$types/core';

/**
 * Building system helpers (see §18 / §60).
 *
 * Pure, engine-agnostic utilities for resolving which crafting stations are
 * reachable from a position, given the placed buildings. The authoritative
 * building list lives in GameState; these functions operate on it.
 */
export interface PlacedBuilding {
	id: string;
	definitionId: string;
	position: Vec2;
	rotation: number;
	state: Record<string, unknown>;
}

/** Crafting station ids reachable from `position` (always includes 'hand'). */
export function reachableStations(buildings: PlacedBuilding[], position: Vec2): Set<string> {
	const set = new Set<string>(['hand']);
	for (const b of buildings) {
		const def = getBuilding(b.definitionId);
		if (!def?.station) continue;
		const d = Math.hypot(b.position.x - position.x, b.position.y - position.y);
		if (d <= BALANCE.crafting.stationRange) set.add(def.station);
	}
	return set;
}

/** True if a position is within range of a building that is a respawn anchor. */
export function isNearRespawnAnchor(buildings: PlacedBuilding[], position: Vec2): boolean {
	for (const b of buildings) {
		const def = getBuilding(b.definitionId);
		if (!def?.isRespawnAnchor) continue;
		const d = Math.hypot(b.position.x - position.x, b.position.y - position.y);
		if (d <= BALANCE.crafting.stationRange) return true;
	}
	return false;
}

/** Nearest respawn anchor position, or null. */
export function nearestRespawnAnchor(buildings: PlacedBuilding[]): Vec2 | null {
	const anchor = buildings.find((b) => getBuilding(b.definitionId)?.isRespawnAnchor);
	return anchor ? { ...anchor.position } : null;
}

/** Building definitions available to the player given their skill levels. */
export function availableBuildings(skills: Record<string, number>): BuildingDefinition[] {
	return BUILDING_LIST.filter((b) => {
		const need = b.unlock?.skill;
		if (!need) return true;
		return (skills[need.id] ?? 0) >= need.level;
	});
}
