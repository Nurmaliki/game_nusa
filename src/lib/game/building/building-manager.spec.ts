import { describe, it, expect } from 'vitest';
import {
	reachableStations,
	isNearRespawnAnchor,
	nearestRespawnAnchor,
	availableBuildings,
	type PlacedBuilding
} from './building-manager';
import { BALANCE } from '../config/balance';

const b = (definitionId: string, x: number, y: number): PlacedBuilding => ({
	id: `${definitionId}_${x}_${y}`,
	definitionId,
	position: { x, y },
	rotation: 0,
	state: {}
});

describe('reachableStations', () => {
	it('always includes hand', () => {
		expect(reachableStations([], { x: 0, y: 0 }).has('hand')).toBe(true);
	});

	it('includes a station building within range', () => {
		const near = b('workbench', BALANCE.crafting.stationRange - 5, 0);
		expect(reachableStations([near], { x: 0, y: 0 }).has('workbench')).toBe(true);
	});

	it('excludes a station building out of range', () => {
		const far = b('workbench', BALANCE.crafting.stationRange + 50, 0);
		expect(reachableStations([far], { x: 0, y: 0 }).has('workbench')).toBe(false);
	});

	it('ignores buildings without a station', () => {
		const fence = b('fence', 0, 0);
		const set = reachableStations([fence], { x: 0, y: 0 });
		expect([...set]).toEqual(['hand']);
	});
});

describe('respawn anchors', () => {
	it('detects proximity to an anchor building', () => {
		const bed = b('bed', 0, 0);
		expect(isNearRespawnAnchor([bed], { x: 10, y: 10 })).toBe(true);
		expect(isNearRespawnAnchor([bed], { x: 9999, y: 9999 })).toBe(false);
	});

	it('returns the nearest anchor position', () => {
		const shelter = b('shelter', 100, 100);
		expect(nearestRespawnAnchor([shelter])).toEqual({ x: 100, y: 100 });
	});

	it('returns null when no anchor exists', () => {
		expect(nearestRespawnAnchor([b('fence', 0, 0)])).toBeNull();
	});
});

describe('availableBuildings', () => {
	it('hides skill-gated buildings until the level is met', () => {
		const locked = availableBuildings({ crafting: 1 }).map((x) => x.id);
		expect(locked).not.toContain('house');
		expect(locked).not.toContain('boat_workshop');
	});

	it('reveals gated buildings once the skill is high enough', () => {
		const unlocked = availableBuildings({ crafting: 5 }).map((x) => x.id);
		expect(unlocked).toContain('house');
		expect(unlocked).toContain('boat_workshop');
	});

	it('always includes ungated buildings', () => {
		expect(availableBuildings({}).map((x) => x.id)).toContain('campfire');
	});
});
