import type { InventorySave } from '$types/save';
import type { ItemStack } from '$types/items';
import type { ItemDefinition } from '$types/items';
import { err, ok, type Result } from '$types/core';

/**
 * Pure inventory domain logic (see §15 / §60).
 *
 * INVARIANTS:
 *  - Every operation is transactional: a failed operation leaves the inventory
 *    byte-for-byte unchanged (clone-on-write).
 *  - No Phaser/Svelte imports: fully unit-testable in isolation.
 *  - Item definitions are injected via a lookup so this module stays decoupled
 *    from the concrete data table (enables easy testing with fixtures).
 */
export type ItemLookup = (id: string) => ItemDefinition | undefined;

export class Inventory {
	private slots: (ItemStack | null)[];
	readonly capacity: number;
	readonly hotbarSize: number;
	/** Bumped on every successful mutation so the UI can react cheaply. */
	revision = 0;

	constructor(capacity: number, hotbarSize: number, slots?: (ItemStack | null)[]) {
		this.capacity = capacity;
		this.hotbarSize = hotbarSize;
		this.slots = slots ? slots.map((s) => (s ? { ...s } : null)) : new Array(capacity).fill(null);
		if (this.slots.length !== capacity) {
			// Defensive: pad/trim to the declared capacity.
			const next: (ItemStack | null)[] = new Array(capacity).fill(null);
			for (let i = 0; i < Math.min(capacity, this.slots.length); i++) next[i] = this.slots[i];
			this.slots = next;
		}
	}

	/** Frozen snapshot of all slots (for persistence / rendering). */
	toArray(): (ItemStack | null)[] {
		return this.slots.map((s) => (s ? { ...s } : null));
	}

	get(index: number): ItemStack | null {
		const s = this.slots[index];
		return s ? { ...s } : null;
	}

	set(index: number, stack: ItemStack | null): void {
		this.slots[index] = stack ? { ...stack } : null;
		this.revision++;
	}

	/** Total quantity of an item id across all slots. */
	count(itemId: string): number {
		let n = 0;
		for (const s of this.slots) if (s && s.id === itemId) n += s.qty;
		return n;
	}

	has(itemId: string, qty = 1): boolean {
		return this.count(itemId) >= qty;
	}

	/** True if every stack in `needs` is satisfied. */
	hasAll(needs: ItemStack[]): boolean {
		return needs.every((n) => this.has(n.id, n.qty));
	}

	freeSlots(): number {
		return this.slots.reduce((acc, s) => acc + (s === null ? 1 : 0), 0);
	}

	isFull(): boolean {
		return this.freeSlots() === 0;
	}

	/**
	 * Add a stack. Merges into existing stacks up to stackSize, then fills empty
	 * slots. If there is not enough room, NOTHING is added (atomic) and an error
	 * with the missing count is returned.
	 */
	add(
		stack: ItemStack,
		def: ItemDefinition
	): Result<{ added: number }, { reason: string; missing: number }> {
		const clone = this.cloneSlots();
		const missing = this.tryMerge(clone, stack, def);
		if (missing > 0) {
			return err({ reason: 'inventory_full', missing });
		}
		this.slots = clone;
		this.revision++;
		return ok({ added: stack.qty });
	}

	/** Add many stacks atomically (all-or-nothing). */
	addMany(stacks: ItemStack[], lookup: ItemLookup): Result<void, string> {
		const clone = this.cloneSlots();
		const staged = new Inventory(this.capacity, this.hotbarSize, clone);
		for (const s of stacks) {
			const def = lookup(s.id);
			if (!def) return err(`unknown item: ${s.id}`);
			const missing = staged.tryMerge(staged.slots, s, def);
			if (missing > 0) return err(`inventory_full (missing ${missing} of ${s.id})`);
		}
		this.slots = staged.slots;
		this.revision++;
		return ok(undefined);
	}

	/**
	 * Remove `qty` of itemId. Atomic: if there isn't enough, nothing is removed.
	 */
	remove(itemId: string, qty: number): Result<void, string> {
		if (qty <= 0) return err('qty must be positive');
		if (this.count(itemId) < qty) return err(`not enough ${itemId}`);
		const clone = this.cloneSlots();
		let remaining = qty;
		for (let i = 0; i < clone.length && remaining > 0; i++) {
			const s = clone[i];
			if (s && s.id === itemId) {
				const take = Math.min(s.qty, remaining);
				s.qty -= take;
				remaining -= take;
				if (s.qty <= 0) clone[i] = null;
			}
		}
		this.slots = clone;
		this.revision++;
		return ok(undefined);
	}

	/** Remove every stack listed in `needs` atomically. */
	removeAll(needs: ItemStack[]): Result<void, string> {
		if (!this.hasAll(needs)) return err('insufficient ingredients');
		const clone = this.cloneSlots();
		const staged = new Inventory(this.capacity, this.hotbarSize, clone);
		for (const n of needs) {
			const r = staged.remove(n.id, n.qty);
			if (!r.ok) return r;
		}
		this.slots = staged.slots;
		this.revision++;
		return ok(undefined);
	}

	/** Move a stack between two slots (merge if same id, else swap). */
	move(from: number, to: number, def: ItemDefinition): Result<void, string> {
		if (from === to) return ok(undefined);
		if (!this.inRange(from) || !this.inRange(to)) return err('slot out of range');
		const src = this.slots[from];
		if (!src) return err('empty source slot');
		const dst = this.slots[to];
		const clone = this.cloneSlots();

		if (dst && dst.id === src.id) {
			const total = dst.qty + src.qty;
			if (total <= def.stackSize) {
				clone[to] = { ...dst, qty: total };
				clone[from] = null;
			} else {
				clone[to] = { ...dst, qty: def.stackSize };
				clone[from] = { ...src, qty: total - def.stackSize };
			}
		} else {
			clone[to] = src;
			clone[from] = dst;
		}
		this.slots = clone;
		this.revision++;
		return ok(undefined);
	}

	/** Split off `qty` from a slot into an empty target slot. */
	split(from: number, to: number, qty: number): Result<void, string> {
		if (!this.inRange(from) || !this.inRange(to)) return err('slot out of range');
		const src = this.slots[from];
		if (!src) return err('empty source slot');
		if (qty <= 0 || qty >= src.qty) return err('invalid split quantity');
		if (this.slots[to]) return err('target slot not empty');
		const clone = this.cloneSlots();
		clone[from] = { ...src, qty: src.qty - qty };
		clone[to] = { ...src, qty };
		this.slots = clone;
		this.revision++;
		return ok(undefined);
	}

	/** Drop an entire slot, returning the removed stack. */
	drop(index: number): Result<ItemStack | null, string> {
		if (!this.inRange(index)) return err('slot out of range');
		const s = this.slots[index];
		if (!s) return ok(null);
		this.slots[index] = null;
		this.revision++;
		return ok({ ...s });
	}

	isEmpty(): boolean {
		return this.slots.every((s) => s === null);
	}

	/** Serialisable snapshot for the save system. */
	serialize(): InventorySave {
		return {
			slots: this.toArray(),
			capacity: this.capacity,
			hotbarSize: this.hotbarSize
		};
	}

	static deserialize(save: InventorySave): Inventory {
		return new Inventory(save.capacity, save.hotbarSize, save.slots);
	}

	// ── internals ───────────────────────────────────────────────────────

	private cloneSlots(): (ItemStack | null)[] {
		return this.slots.map((s) => (s ? { ...s } : null));
	}

	private inRange(i: number): boolean {
		return Number.isInteger(i) && i >= 0 && i < this.capacity;
	}

	/**
	 * Merge a stack into the provided slot array, returning how many units could
	 * NOT be placed (0 = fully placed).
	 */
	private tryMerge(slots: (ItemStack | null)[], stack: ItemStack, def: ItemDefinition): number {
		let remaining = stack.qty;
		// Pass 1: top up existing stacks of the same item (respecting durability).
		for (let i = 0; i < slots.length && remaining > 0; i++) {
			const s = slots[i];
			if (s && s.id === stack.id && s.durability === stack.durability && s.qty < def.stackSize) {
				const space = def.stackSize - s.qty;
				const put = Math.min(space, remaining);
				s.qty += put;
				remaining -= put;
			}
		}
		// Pass 2: fill empty slots.
		for (let i = 0; i < slots.length && remaining > 0; i++) {
			if (slots[i] === null) {
				// Tools/weapons (stackSize 1) keep their own durability per unit.
				const put = Math.min(def.stackSize, remaining);
				slots[i] = { id: stack.id, qty: put, durability: stack.durability };
				remaining -= put;
			}
		}
		return remaining;
	}
}
