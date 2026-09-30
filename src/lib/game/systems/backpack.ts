import type { ItemStack } from '$types/items';
import type { ItemDefinition } from '$types/items';
import { BALANCE } from '../config/balance';

/**
 * Backpack drop & recovery (see §25 / §53).
 *
 * On death, a fraction of the player's non-critical inventory is dropped as a
 * "backpack" at the death location. The backpack is recoverable: picking it up
 * returns its contents. Critical quest items and no-drop items are NEVER
 * dropped, preventing soft-locks.
 */
export interface Backpack {
	id: string;
	position: { x: number; y: number };
	contents: ItemStack[];
}

export type ItemLookup = (id: string) => ItemDefinition | undefined;

/**
 * Decide which slots become a backpack. `nonHotbarSlots` are candidate slots
 * (the hotbar is kept so the player retains basic tools). Returns the selected
 * item stacks and the slot indices that were dropped.
 */
export function selectBackpackDrop(
	slots: (ItemStack | null)[],
	hotbarSize: number,
	lookup: ItemLookup
): { dropped: ItemStack[]; indices: number[] } {
	const candidates: number[] = [];
	for (let i = hotbarSize; i < slots.length; i++) {
		const s = slots[i];
		if (!s) continue;
		const def = lookup(s.id);
		if (def?.questCritical || def?.noDrop) continue; // never drop these
		candidates.push(i);
	}

	const count = Math.floor(candidates.length * BALANCE.death.backpackDropFraction);
	const dropped: ItemStack[] = [];
	const indices: number[] = [];
	for (let k = 0; k < count; k++) {
		const idx = candidates[k];
		const s = slots[idx];
		if (s) {
			dropped.push({ ...s });
			indices.push(idx);
		}
	}
	return { dropped, indices };
}

/**
 * Guarantee that a set of items is never lost: given the dropped stacks, return
 * any stacks that are critical (defensive — callers should already exclude them).
 */
export function stripCritical(stacks: ItemStack[], lookup: ItemLookup): ItemStack[] {
	return stacks.filter((s) => {
		const def = lookup(s.id);
		return !(def?.questCritical || def?.noDrop);
	});
}

/** Merge a recovered backpack's contents back into an inventory (atomic). */
export function mergeBackpack(
	backpack: Backpack,
	inv: {
		addMany: (stacks: ItemStack[], lookup: ItemLookup) => { ok: boolean };
	},
	lookup: ItemLookup
): { ok: boolean; remaining: ItemStack[] } {
	const result = inv.addMany(backpack.contents, lookup);
	if (result.ok) return { ok: true, remaining: [] };
	// If there wasn't room, keep the whole backpack intact (nothing lost).
	return { ok: false, remaining: backpack.contents };
}
