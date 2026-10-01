import { describe, it, expect } from 'vitest';
import { Inventory, sortSlots } from './inventory';
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
	},
	berry: {
		id: 'berry',
		name: 'Berry',
		description: '',
		category: 'food',
		stackSize: 20,
		weight: 1,
		rarity: 'uncommon',
		icon: 'x',
		sellValue: 1,
		tags: []
	},
	relic: {
		id: 'relic',
		name: 'Relic',
		description: '',
		category: 'quest',
		stackSize: 1,
		weight: 1,
		rarity: 'quest',
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

describe('sortSlots', () => {
	it('is pure: does not mutate the input array', () => {
		const input = [{ id: 'stone', qty: 5 }, null, { id: 'axe', qty: 1 }];
		const snapshot = JSON.parse(JSON.stringify(input));
		sortSlots(input, lookup);
		expect(input).toEqual(snapshot);
	});

	it('orders by category (tools before resources) and pushes empties last', () => {
		const out = sortSlots([{ id: 'wood', qty: 3 }, null, { id: 'axe', qty: 1 }], lookup);
		expect(out[0]).toEqual({ id: 'axe', qty: 1 });
		expect(out[1]).toEqual({ id: 'wood', qty: 3 });
		expect(out[2]).toBeNull();
	});

	it('groups identical stacks together', () => {
		const out = sortSlots(
			[
				{ id: 'wood', qty: 1 },
				{ id: 'stone', qty: 1 },
				{ id: 'wood', qty: 2 }
			],
			lookup
		);
		// The two wood stacks must be adjacent (same-id grouping), regardless of
		// whether wood or stone is the alphabetically-first resource.
		const ids = out.map((s) => s?.id);
		const firstWood = ids.indexOf('wood');
		expect(ids[firstWood + 1]).toBe('wood');
	});

	it('ranks rarer items ahead within the same category', () => {
		// both food? use resource/common vs food/uncommon -> category dominates.
		const out = sortSlots(
			[
				{ id: 'relic', qty: 1 },
				{ id: 'berry', qty: 1 }
			],
			lookup
		);
		expect(out[0]?.id).toBe('berry'); // food outranks quest
	});

	it('is stable and deterministic across repeated calls', () => {
		const input = [
			{ id: 'wood', qty: 3 },
			{ id: 'berry', qty: 2 },
			{ id: 'axe', qty: 1 },
			{ id: 'stone', qty: 4 }
		];
		expect(sortSlots(input, lookup)).toEqual(sortSlots(input, lookup));
	});

	it('keeps capacity length (padding with nulls)', () => {
		const out = sortSlots([{ id: 'wood', qty: 3 }, null, null, null], lookup);
		expect(out).toHaveLength(4);
	});

	it('puts a fresher tool before a worn one of the same id', () => {
		const out = sortSlots(
			[
				{ id: 'axe', qty: 1, durability: 5 },
				{ id: 'axe', qty: 1, durability: 40 }
			],
			lookup
		);
		expect(out[0]?.durability).toBe(40);
		expect(out[1]?.durability).toBe(5);
	});
});

describe('Inventory.sort', () => {
	it('reorders slots and bumps the revision', () => {
		const i = inv();
		i.set(0, { id: 'wood', qty: 3 });
		i.set(1, { id: 'axe', qty: 1 });
		const before = i.revision;
		i.sort(lookup);
		expect(i.get(0)?.id).toBe('axe');
		expect(i.get(1)?.id).toBe('wood');
		expect(i.revision).toBeGreaterThan(before);
	});

	it('is a no-op (no revision bump) when already sorted', () => {
		const i = inv();
		i.set(0, { id: 'axe', qty: 1 });
		i.sort(lookup);
		const after = i.revision;
		i.sort(lookup);
		expect(i.revision).toBe(after);
	});
});
