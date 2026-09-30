import { describe, it, expect } from 'vitest';
import { mergeBackpack, selectBackpackDrop, stripCritical, type Backpack } from './backpack';
import { getItem } from '$data/items';
import { Inventory } from '../core/inventory';
import type { ItemStack } from '$types/items';

const lookup = (id: string) => getItem(id);

describe('selectBackpackDrop', () => {
	it('never drops quest-critical or no-drop items', () => {
		const slots: (ItemStack | null)[] = [];
		// hotbar (5) stays intact.
		for (let i = 0; i < 5; i++) slots.push(null);
		// Non-hotbar region: mix critical + normal.
		slots.push({ id: 'ancient_fragment', qty: 1 });
		for (let i = 0; i < 9; i++) slots.push({ id: 'stone', qty: 5 });
		const { dropped } = selectBackpackDrop(slots, 5, lookup);
		expect(dropped.every((d) => d.id !== 'ancient_fragment')).toBe(true);
	});

	it('drops roughly the configured fraction of eligible stacks', () => {
		const slots: (ItemStack | null)[] = [];
		for (let i = 0; i < 5; i++) slots.push(null);
		for (let i = 0; i < 10; i++) slots.push({ id: 'stone', qty: 5 });
		const { dropped, indices } = selectBackpackDrop(slots, 5, lookup);
		expect(indices.length).toBe(dropped.length);
		expect(dropped.length).toBeGreaterThan(0);
		expect(dropped.length).toBeLessThanOrEqual(10);
	});

	it('ignores the hotbar', () => {
		const slots: (ItemStack | null)[] = new Array(24).fill(null);
		slots[0] = { id: 'stone', qty: 5 }; // hotbar slot
		const { dropped } = selectBackpackDrop(slots, 5, lookup);
		expect(dropped).toHaveLength(0);
	});
});

describe('stripCritical', () => {
	it('filters out critical stacks', () => {
		const stacks: ItemStack[] = [
			{ id: 'stone', qty: 1 },
			{ id: 'ancient_fragment', qty: 1 }
		];
		expect(stripCritical(stacks, lookup).map((s) => s.id)).toEqual(['stone']);
	});
});

describe('mergeBackpack', () => {
	it('adds contents atomically when there is room', () => {
		const inv = new Inventory(24, 5);
		const bp: Backpack = {
			id: 'bp1',
			position: { x: 0, y: 0 },
			contents: [{ id: 'stone', qty: 10 }]
		};
		const r = mergeBackpack(bp, inv, lookup);
		expect(r.ok).toBe(true);
		expect(inv.count('stone')).toBe(10);
	});

	it('keeps the backpack intact when the inventory is full', () => {
		const inv = new Inventory(1, 0);
		inv.add({ id: 'wood', qty: 100 }, getItem('wood')!);
		const bp: Backpack = {
			id: 'bp2',
			position: { x: 0, y: 0 },
			contents: [{ id: 'stone', qty: 10 }]
		};
		const r = mergeBackpack(bp, inv, lookup);
		expect(r.ok).toBe(false);
		expect(r.remaining).toHaveLength(1);
	});
});
