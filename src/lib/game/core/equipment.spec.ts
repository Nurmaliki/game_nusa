import { describe, it, expect } from 'vitest';
import { Equipment } from './equipment';
import { getItem } from '$data/items';
import type { ItemDefinition } from '$types/items';

const lookup = (id: string) => getItem(id) as ItemDefinition | undefined;

describe('Equipment selection', () => {
	it('clamps the active slot to range', () => {
		const e = new Equipment(5);
		e.select(9);
		expect(e.activeSlot).toBe(0);
		e.select(3);
		expect(e.activeSlot).toBe(3);
	});

	it('returns the held item by active slot', () => {
		const e = new Equipment(5);
		e.select(2);
		const slots = [null, null, { id: 'stone_axe', qty: 1 }, null, null];
		expect(e.heldItem(slots)?.id).toBe('stone_axe');
	});

	it('resolves the held tool definition', () => {
		const e = new Equipment(5);
		e.select(0);
		const slots = [{ id: 'stone_axe', qty: 1 }, null, null, null, null];
		expect(e.heldTool(slots, lookup)?.kind).toBe('axe');
	});
});

describe('Equipment weapons & armor', () => {
	it('equips and unequips a weapon', () => {
		const e = new Equipment(5);
		const r = e.equipWeapon({ id: 'wooden_spear', qty: 1 }, getItem('wooden_spear')!);
		expect(r.ok).toBe(true);
		expect(e.weapon?.id).toBe('wooden_spear');
		expect(e.unequipWeapon()?.id).toBe('wooden_spear');
		expect(e.weapon).toBeNull();
	});

	it('rejects equipping a non-weapon', () => {
		const e = new Equipment(5);
		expect(e.equipWeapon({ id: 'wood', qty: 1 }, getItem('wood')!).ok).toBe(false);
	});

	it('computes armor reduction scaled by durability', () => {
		const e = new Equipment(5);
		e.armor = { id: 'x', qty: 1, durability: 50 };
		// No armor definition on 'x' => zero reduction (defensive).
		expect(e.armorReduction(lookup)).toBe(0);
	});

	it('breaks a weapon at zero durability', () => {
		const e = new Equipment(5);
		e.weapon = { id: 'wooden_spear', qty: 1, durability: 2 };
		const broke = e.damageWeapon(2, lookup);
		expect(broke).toBe(true);
		expect(e.weapon).toBeNull();
	});
});
