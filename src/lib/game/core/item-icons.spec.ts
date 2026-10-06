import { describe, expect, it } from 'vitest';
import { itemIcon, rarityBorder } from './item-icons';
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
		expect(itemIcon(undefined, 'axe').glyph).toBe('🪓');
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
