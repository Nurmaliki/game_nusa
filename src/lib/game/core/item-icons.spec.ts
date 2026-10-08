import { describe, expect, it } from 'vitest';
import { itemIcon, rarityBorder, ITEM_ICON_IDS } from './item-icons';
import { ITEM_LIST } from '$data/items';
import type { ItemDefinition } from '$types/items';

function def(partial: Partial<ItemDefinition> & { id: string }): ItemDefinition {
	return {
		name: partial.id,
		description: '',
		category: 'resource',
		stackSize: 99,
		weight: 1,
		rarity: 'common',
		icon: 'x',
		sellValue: 1,
		tags: [],
		...partial
	} as ItemDefinition;
}

describe('itemIcon', () => {
	it('prefers an explicit id override', () => {
		expect(itemIcon(def({ id: 'wood' }), 'wood').glyph).toBe('🪵');
	});

	it('falls back to the id when the def is missing', () => {
		expect(itemIcon(undefined, 'stone_axe').glyph).toBe('🪓');
		expect(itemIcon(undefined, 'seed').glyph).toBe('🌱');
		expect(itemIcon(undefined, 'shell').glyph).toBe('🐚');
	});

	it('falls back to the category default', () => {
		const icon = itemIcon(def({ id: 'mystery', category: 'weapon' }), 'mystery');
		expect(icon.glyph).toBe('⚔️');
	});

	it('always returns a glyph and a tint', () => {
		const icon = itemIcon(def({ id: 'unknown-thing', category: 'material' }), 'unknown-thing');
		expect(icon.glyph).toBeTruthy();
		expect(icon.tint).toMatch(/^#|var\(/);
	});

	it('returns a rarity border colour, defaulting to common', () => {
		expect(rarityBorder('rare')).toBe('#5aa2e0');
		expect(rarityBorder(undefined)).toBe('#b9ad92');
	});
});

describe('icon coverage', () => {
	it('has an explicit glyph for EVERY catalogue item id', () => {
		const missing = ITEM_LIST.map((i) => i.id).filter((id) => !ITEM_ICON_IDS.has(id));
		// A missing id silently falls back to a category glyph, which reads as the
		// wrong object ("Kapak Batu" → 🔧). Fail loudly so new items get real icons.
		expect(missing).toEqual([]);
	});

	it('never returns the generic material thread for a tool/weapon/resource', () => {
		for (const item of ITEM_LIST) {
			if (item.category === 'material') continue;
			const glyph = itemIcon(item, item.id).glyph;
			expect(glyph).not.toBe('🧵');
		}
	});
});
