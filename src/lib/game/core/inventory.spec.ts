import { describe, it, expect } from 'vitest';
import { Inventory } from './inventory';
import type { ItemDefinition } from '$types/items';

const defs: Record<string, ItemDefinition> = {
	wood: {
		id: 'wood',
		name: 'Wood',
		description: '',
		category: 'resource',
		stackSize: 10,
		weight: 1,
		rarity: 'common',
		icon: 'x',
		sellValue: 1,
		tags: []
	},
	stone: {
		id: 'stone',
		name: 'Stone',
		description: '',
		category: 'resource',
		stackSize: 5,
		weight: 1,
		rarity: 'common',
		icon: 'x',
		sellValue: 1,
		tags: []
	},
	axe: {
		id: 'axe',
		name: 'Axe',
		description: '',
		category: 'tool',
		stackSize: 1,
		weight: 1,
		rarity: 'common',
		icon: 'x',
		sellValue: 1,
		tags: []
	}
};
const lookup = (id: string) => defs[id];

function inv(capacity = 6, hotbar = 5) {
	return new Inventory(capacity, hotbar);
}

describe('Inventory.add', () => {
	it('places a new item into the first empty slot', () => {
		const i = inv();
		expect(i.add({ id: 'wood', qty: 3 }, defs.wood).ok).toBe(true);
		expect(i.get(0)).toEqual({ id: 'wood', qty: 3 });
	});

	it('merges into existing stacks up to stackSize', () => {
		const i = inv();
		i.add({ id: 'wood', qty: 6 }, defs.wood);
		i.add({ id: 'wood', qty: 4 }, defs.wood);
		expect(i.get(0)?.qty).toBe(10);
		expect(i.freeSlots()).toBe(5);
	});

	it('spills into a new slot when the first is full', () => {
		const i = inv();
		i.add({ id: 'wood', qty: 10 }, defs.wood);
		i.add({ id: 'wood', qty: 5 }, defs.wood);
		expect(i.get(0)?.qty).toBe(10);
		expect(i.get(1)?.qty).toBe(5);
	});

	it('is atomic when there is not enough room', () => {
		const i = inv(2, 5);
		i.add({ id: 'wood', qty: 10 }, defs.wood);
		i.add({ id: 'stone', qty: 5 }, defs.stone);
		// No room left for more wood (2 slots, both full).
		const r = i.add({ id: 'wood', qty: 1 }, defs.wood);
		expect(r.ok).toBe(false);
		expect(i.get(0)).toEqual({ id: 'wood', qty: 10 });
		expect(i.get(1)).toEqual({ id: 'stone', qty: 5 });
	});

	it('keeps durability separate when merging tools', () => {
		const i = inv();
		i.add({ id: 'axe', qty: 1, durability: 10 }, defs.axe);
		i.add({ id: 'axe', qty: 1, durability: 8 }, defs.axe);
		expect(i.get(0)).toEqual({ id: 'axe', qty: 1, durability: 10 });
		expect(i.get(1)).toEqual({ id: 'axe', qty: 1, durability: 8 });
	});
});

describe('Inventory.remove', () => {
	it('removes across multiple stacks', () => {
		const i = inv();
		i.add({ id: 'wood', qty: 10 }, defs.wood);
		i.add({ id: 'wood', qty: 5 }, defs.wood);
		expect(i.remove('wood', 12).ok).toBe(true);
		expect(i.count('wood')).toBe(3);
	});

	it('is atomic when there is not enough', () => {
		const i = inv();
		i.add({ id: 'wood', qty: 5 }, defs.wood);
		expect(i.remove('wood', 6).ok).toBe(false);
		expect(i.count('wood')).toBe(5);
	});
});

describe('Inventory.removeAll', () => {
	it('consumes ingredients atomically', () => {
		const i = inv();
		i.add({ id: 'wood', qty: 5 }, defs.wood);
		i.add({ id: 'stone', qty: 5 }, defs.stone);
		const r = i.removeAll([
			{ id: 'wood', qty: 3 },
			{ id: 'stone', qty: 2 }
		]);
		expect(r.ok).toBe(true);
		expect(i.count('wood')).toBe(2);
		expect(i.count('stone')).toBe(3);
	});

	it('removes nothing if one ingredient is missing', () => {
		const i = inv();
		i.add({ id: 'wood', qty: 5 }, defs.wood);
		const r = i.removeAll([
			{ id: 'wood', qty: 3 },
			{ id: 'stone', qty: 1 }
		]);
		expect(r.ok).toBe(false);
		expect(i.count('wood')).toBe(5);
	});
});

describe('Inventory.move', () => {
	it('merges same-id stacks on move', () => {
		const i = inv();
		i.set(0, { id: 'wood', qty: 4 });
		i.set(2, { id: 'wood', qty: 3 });
		expect(i.move(0, 2, defs.wood).ok).toBe(true);
		expect(i.get(2)?.qty).toBe(7);
		expect(i.get(0)).toBeNull();
	});

	it('swaps different items', () => {
		const i = inv();
		i.set(0, { id: 'wood', qty: 1 });
		i.set(1, { id: 'stone', qty: 1 });
		expect(i.move(0, 1, defs.wood).ok).toBe(true);
		expect(i.get(0)?.id).toBe('stone');
		expect(i.get(1)?.id).toBe('wood');
	});

	it('handles overflow merging up to stackSize', () => {
		const i = inv();
		i.set(0, { id: 'wood', qty: 8 });
		i.set(1, { id: 'wood', qty: 8 });
		i.move(0, 1, defs.wood);
		expect(i.get(1)?.qty).toBe(10);
		expect(i.get(0)?.qty).toBe(6);
	});
});

describe('Inventory.split', () => {
	it('splits a valid quantity', () => {
		const i = inv();
		i.set(0, { id: 'wood', qty: 8 });
		expect(i.split(0, 1, 3).ok).toBe(true);
		expect(i.get(0)?.qty).toBe(5);
		expect(i.get(1)?.qty).toBe(3);
	});

	it('rejects invalid splits', () => {
		const i = inv();
		i.set(0, { id: 'wood', qty: 8 });
		expect(i.split(0, 1, 8).ok).toBe(false);
		expect(i.split(0, 1, 0).ok).toBe(false);
	});
});

describe('Inventory.serialize', () => {
	it('round-trips through serialize/deserialize', () => {
		const i = inv();
		i.add({ id: 'wood', qty: 7 }, defs.wood);
		i.add({ id: 'axe', qty: 1, durability: 20 }, defs.axe);
		const restored = Inventory.deserialize(i.serialize());
		expect(restored.toArray()).toEqual(i.toArray());
	});

	it('addMany is atomic across the whole batch', () => {
		const i = inv(2, 5);
		const r = i.addMany(
			[
				{ id: 'wood', qty: 10 },
				{ id: 'stone', qty: 5 },
				{ id: 'wood', qty: 1 }
			],
			lookup
		);
		expect(r.ok).toBe(false);
		expect(i.isEmpty()).toBe(true);
	});
});

describe('Inventory durability preservation', () => {
	it('does not merge stacks with different durability', () => {
		const i = inv();
		i.set(0, { id: 'axe', qty: 1, durability: 30 });
		i.add({ id: 'axe', qty: 1, durability: 15 }, defs.axe);
		expect(i.count('axe')).toBe(2);
		expect(i.get(1)).toEqual({ id: 'axe', qty: 1, durability: 15 });
	});
});
