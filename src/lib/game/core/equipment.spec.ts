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

describe('Equipment armor & weapon durability', () => {
	it('equips armor, computes durability-scaled reduction, and unequips', () => {
		const e = new Equipment(5);
		const def = getItem('iron_armor')!;
		expect(
			e.equipArmor({ id: 'iron_armor', qty: 1, durability: def.armor!.durability }, def).ok
		).toBe(true);
		// Full durability => full listed reduction.
		expect(e.armorReduction(lookup)).toBeCloseTo(def.armor!.damageReduction);
		// Half durability => half reduction.
		e.armor = { id: 'iron_armor', qty: 1, durability: def.armor!.durability / 2 };
		expect(e.armorReduction(lookup)).toBeCloseTo(def.armor!.damageReduction / 2);
		expect(e.unequipArmor()?.id).toBe('iron_armor');
		expect(e.armorReduction(lookup)).toBe(0);
	});

	it('rejects equipping a non-armor item', () => {
		const e = new Equipment(5);
		expect(e.equipArmor({ id: 'wood', qty: 1 }, getItem('wood')!).ok).toBe(false);
	});

	it('unequipWeapon returns the weapon and clears the slot', () => {
		const e = new Equipment(5);
		e.weapon = { id: 'wooden_spear', qty: 1, durability: 5 };
		expect(e.unequipWeapon()?.id).toBe('wooden_spear');
		expect(e.weapon).toBeNull();
		expect(e.unequipWeapon()).toBeNull();
	});

	it('damageWeapon reduces durability and is a no-op without a weapon', () => {
		const e = new Equipment(5);
		expect(e.damageWeapon(1, lookup)).toBe(false); // no weapon
		e.weapon = { id: 'wooden_spear', qty: 1, durability: 10 };
		expect(e.damageWeapon(3, lookup)).toBe(false);
		expect(e.weapon?.durability).toBe(7);
		// A non-weapon in the slot is ignored defensively.
		e.weapon = { id: 'wood', qty: 1 };
		expect(e.damageWeapon(1, lookup)).toBe(false);
	});
});
