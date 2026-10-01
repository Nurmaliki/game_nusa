import { describe, expect, it } from 'vitest';
import { getItem, requireItem, ITEM_LIST } from './items';
import { getQuest, firstQuestId, QUEST_LIST } from './quests';
import { getRecipe, RECIPE_LIST } from './recipes';
import { getBuilding, BUILDING_LIST } from './buildings';
import { getCreature, CREATURE_LIST } from './creatures';
import { getBiome, BIOME_LIST } from './biomes';
import { getResourceNode, RESOURCE_NODE_LIST } from './resources';
import { getNpc } from './npcs';
import { getAchievement } from './achievements';

/**
 * Data accessor behaviour. These thin lookups are used everywhere, so a broken
 * one (or a missing list export) would be a silent, wide-reaching failure.
 */
describe('data accessors', () => {
	it('resolve known ids and return undefined for unknown ones', () => {
		expect(getItem('wood')?.id).toBe('wood');
		expect(getQuest('chapter1_start')?.id).toBe('chapter1_start');
		expect(getRecipe(RECIPE_LIST[0].id)?.id).toBe(RECIPE_LIST[0].id);
		expect(getBuilding('campfire')?.id).toBe('campfire');
		expect(getCreature('boar')?.id).toBe('boar');
		expect(getBiome('tropical_coast')?.id).toBe('tropical_coast');
		expect(getResourceNode(RESOURCE_NODE_LIST[0].id)).toBeDefined();
	});

	it('returns undefined rather than throwing for unknown ids', () => {
		expect(getItem('nope')).toBeUndefined();
		expect(getQuest('nope')).toBeUndefined();
		expect(getRecipe('nope')).toBeUndefined();
		expect(getBuilding('nope')).toBeUndefined();
		expect(getCreature('nope')).toBeUndefined();
		expect(getBiome('nope' as never)).toBeUndefined();
		expect(getResourceNode('nope')).toBeUndefined();
		expect(getNpc('nope')).toBeUndefined();
		expect(getAchievement('nope')).toBeUndefined();
	});

	it('requireItem returns the item or throws for an unknown id', () => {
		expect(requireItem('wood').id).toBe('wood');
		expect(() => requireItem('definitely_missing')).toThrow(/Unknown item id/);
	});

	it('firstQuestId is the single root of the quest graph', () => {
		const roots = QUEST_LIST.filter((q) => q.prerequisites.length === 0);
		expect(roots).toHaveLength(1);
		expect(firstQuestId()).toBe(roots[0].id);
	});

	it('list exports are non-empty and unique by id', () => {
		for (const [name, list] of [
			['items', ITEM_LIST],
			['quests', QUEST_LIST],
			['recipes', RECIPE_LIST],
			['buildings', BUILDING_LIST],
			['creatures', CREATURE_LIST],
			['biomes', BIOME_LIST],
			['resources', RESOURCE_NODE_LIST]
		] as const) {
			expect(list.length, `${name} empty`).toBeGreaterThan(0);
			const ids = new Set(list.map((x: { id: string }) => x.id));
			expect(ids.size, `${name} has duplicate ids`).toBe(list.length);
		}
	});
});
