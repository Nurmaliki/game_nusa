import { describe, it, expect } from 'vitest';
import {
	validatePlacement,
	describePlacementIssues,
	PLACEMENT_ISSUE_TEXT,
	type PlacementContext,
	type PlacementIssue
} from './placement';
import { getBuilding } from '$data/buildings';
import { Inventory } from '../core/inventory';
import { getItem } from '$data/items';

function ctx(overrides: Partial<PlacementContext> = {}): PlacementContext {
	return {
		playerPos: { x: 0, y: 0 },
		position: { x: 10, y: 10 },
		tileSize: 32,
		occupied: [],
		resourceNodes: [],
		isTerrainValid: () => true,
		inventory: new Inventory(24, 5),
		skills: {},
		...overrides
	};
}

describe('validatePlacement', () => {
	it('accepts a valid placement with materials', () => {
		const inv = new Inventory(24, 5);
		inv.add({ id: 'wood', qty: 5 }, getItem('wood')!);
		inv.add({ id: 'stone', qty: 3 }, getItem('stone')!);
		const res = validatePlacement(getBuilding('campfire')!, ctx({ inventory: inv }));
		expect(res.valid).toBe(true);
		expect(res.issues).toHaveLength(0);
	});

	it('reports missing materials with the shortfall', () => {
		const inv = new Inventory(24, 5);
		inv.add({ id: 'wood', qty: 5 }, getItem('wood')!);
		const res = validatePlacement(getBuilding('campfire')!, ctx({ inventory: inv }));
		expect(res.valid).toBe(false);
		expect(res.issues).toContain('missing_materials');
		expect(res.missing.some((m) => m.id === 'stone')).toBe(true);
	});

	it('flags out-of-range placement', () => {
		const inv = new Inventory(24, 5);
		inv.add({ id: 'wood', qty: 5 }, getItem('wood')!);
		inv.add({ id: 'stone', qty: 3 }, getItem('stone')!);
		const res = validatePlacement(
			getBuilding('campfire')!,
			ctx({ inventory: inv, position: { x: 9999, y: 9999 } })
		);
		expect(res.issues).toContain('out_of_range');
	});

	it('flags invalid terrain', () => {
		const inv = new Inventory(24, 5);
		inv.add({ id: 'wood', qty: 5 }, getItem('wood')!);
		inv.add({ id: 'stone', qty: 3 }, getItem('stone')!);
		const res = validatePlacement(
			getBuilding('campfire')!,
			ctx({ inventory: inv, isTerrainValid: () => false })
		);
		expect(res.issues).toContain('invalid_terrain');
	});

	it('blocks overlap with an occupied object', () => {
		const inv = new Inventory(24, 5);
		inv.add({ id: 'wood', qty: 5 }, getItem('wood')!);
		inv.add({ id: 'stone', qty: 3 }, getItem('stone')!);
		const res = validatePlacement(
			getBuilding('campfire')!,
			ctx({ inventory: inv, occupied: [{ pos: { x: 10, y: 10 }, radius: 8 }] })
		);
		expect(res.issues).toContain('blocked');
	});

	it('respects skill-locked buildings', () => {
		const inv = new Inventory(48, 5);
		inv.add({ id: 'wood', qty: 200 }, getItem('wood')!);
		inv.add({ id: 'fiber', qty: 200 }, getItem('fiber')!);
		inv.add({ id: 'stone', qty: 200 }, getItem('stone')!);
		const locked = validatePlacement(
			getBuilding('house')!,
			ctx({ inventory: inv, skills: { crafting: 1 } })
		);
		expect(locked.issues).toContain('locked');

		const unlocked = validatePlacement(
			getBuilding('house')!,
			ctx({ inventory: inv, skills: { crafting: 3 } })
		);
		expect(unlocked.issues).not.toContain('locked');
	});
});

describe('describePlacementIssues', () => {
	it('renders every issue code as readable Indonesian (never raw codes)', () => {
		for (const issue of Object.keys(PLACEMENT_ISSUE_TEXT) as PlacementIssue[]) {
			const text = describePlacementIssues([issue]);
			expect(text.length).toBeGreaterThan(0);
			expect(text).not.toContain('_');
		}
	});

	it('joins multiple issues with a separator and de-duplicates', () => {
		expect(describePlacementIssues(['out_of_range', 'missing_materials'])).toBe(
			'Terlalu jauh dari kamu · Bahan tidak cukup'
		);
		expect(describePlacementIssues(['blocked', 'blocked'])).toBe('Sudah ada bangunan di sini');
		expect(describePlacementIssues([])).toBe('');
	});
});
