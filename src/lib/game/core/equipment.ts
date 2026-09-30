import type { EquipmentSave } from '$types/save';
import type { ItemDefinition, ItemStack } from '$types/items';
import { err, ok, type Result } from '$types/core';

export type EquipError =
	'unknown_item' | 'not_equippable' | 'empty_slot' | 'no_free_slot' | 'wrong_type';

/**
 * Pure equipment + hotbar domain logic (see §15 / §16 / §32 / §60).
 *
 * The hotbar is a fixed-size selection of the inventory's first N slots; the
 * "active slot" (0..hotbarSize-1) determines the equipped tool/weapon. Equipping
 * a weapon/armor slot is separate from the hotbar to keep the model simple.
 *
 * This module NEVER imports Phaser/Svelte and is fully unit-testable.
 */
export class Equipment {
	hotbarSize: number;
	activeSlot = 0;
	weapon: ItemStack | null;
	armor: ItemStack | null;

	constructor(hotbarSize: number, save?: Partial<EquipmentSave>) {
		this.hotbarSize = hotbarSize;
		this.weapon = save?.weapon ? { ...save.weapon } : null;
		this.armor = save?.armor ? { ...save.armor } : null;
	}

	/** Select an active hotbar slot (clamped to range). */
	select(slot: number): void {
		if (slot < 0 || slot >= this.hotbarSize) return;
		this.activeSlot = slot;
	}

	/**
	 * The tool/weapon the player is currently holding.
	 * `hotbarSlots` are the first `hotbarSize` inventory slots.
	 */
	heldItem(hotbarSlots: (ItemStack | null)[]): ItemStack | null {
		return hotbarSlots[this.activeSlot] ?? null;
	}

	/**
	 * Effective tool definition for the currently held item, if it is a tool.
	 * Weapons may also be used as tools at reduced efficiency (handled by the
	 * gathering system).
	 */
	heldTool(hotbarSlots: (ItemStack | null)[], lookup: (id: string) => ItemDefinition | undefined) {
		const held = this.heldItem(hotbarSlots);
		if (!held) return null;
		const def = lookup(held.id);
		return def?.tool ?? null;
	}

	equipWeapon(stack: ItemStack, def: ItemDefinition): Result<void, EquipError> {
		if (!def.weapon) return err('not_equippable');
		this.weapon = { ...stack };
		return ok(undefined);
	}

	equipArmor(stack: ItemStack, def: ItemDefinition): Result<void, EquipError> {
		if (!def.armor) return err('not_equippable');
		this.armor = { ...stack };
		return ok(undefined);
	}

	unequipWeapon(): ItemStack | null {
		const w = this.weapon;
		this.weapon = null;
		return w;
	}

	unequipArmor(): ItemStack | null {
		const a = this.armor;
		this.armor = null;
		return a;
	}

	/** Damage reduction (0..1) from equipped armor, by remaining durability. */
	armorReduction(lookup: (id: string) => ItemDefinition | undefined): number {
		if (!this.armor) return 0;
		const def = lookup(this.armor.id);
		if (!def?.armor) return 0;
		const max = def.armor.durability || 1;
		const ratio = (this.armor.durability ?? max) / max;
		return def.armor.damageReduction * ratio;
	}

	/** Apply durability loss to the weapon; auto-unequips when broken. */
	damageWeapon(amount: number, lookup: (id: string) => ItemDefinition | undefined): boolean {
		if (!this.weapon) return false;
		const def = lookup(this.weapon.id);
		if (!def?.weapon) return false;
		const current = this.weapon.durability ?? 0;
		const next = current - amount;
		if (next <= 0) {
			this.weapon = null;
			return true; // broke
		}
		this.weapon = { ...this.weapon, durability: next };
		return false;
	}

	serialize(hotbarSlots: (ItemStack | null)[]): EquipmentSave {
		return {
			hotbar: hotbarSlots.map((s) => (s ? { ...s } : null)),
			weapon: this.weapon ? { ...this.weapon } : null,
			armor: this.armor ? { ...this.armor } : null
		};
	}
}
