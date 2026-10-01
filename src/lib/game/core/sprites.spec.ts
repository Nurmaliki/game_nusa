import { describe, expect, it } from 'vitest';
import { creatureTexture, resourceTexture, SPRITE_KEYS } from './sprite-keys';
import { RESOURCE_NODE_LIST } from '$data/resources';
import { CREATURE_LIST } from '$data/creatures';

/**
 * Guards the data -> sprite-key mapping. The renderers fall back to a generic
 * key for unknown content, so a missing case is silently invisible in-game —
 * these tests make a forgotten mapping loud instead.
 */
describe('resourceTexture', () => {
	it('maps every shipped resource node to a non-fallback sprite key', () => {
		for (const node of RESOURCE_NODE_LIST) {
			// The generic bush is the documented fallback; no real node should hit it.
			expect(resourceTexture(node.id), `node "${node.id}" falls back to the bush`).not.toBe(
				SPRITE_KEYS.bush
			);
		}
	});

	it('gives the Chapter II volcanic nodes distinct sprites', () => {
		const keys = ['obsidian', 'sulfur_vent', 'rock_gem'].map((id) => resourceTexture(id));
		expect(new Set(keys).size).toBe(keys.length);
		expect(keys).toContain(SPRITE_KEYS.obsidianRock);
		expect(keys).toContain(SPRITE_KEYS.sulfurVent);
		expect(keys).toContain(SPRITE_KEYS.gemVein);
	});

	it('falls back to a bush for unknown node types', () => {
		expect(resourceTexture('does_not_exist')).toBe(SPRITE_KEYS.bush);
	});
});

describe('creatureTexture', () => {
	it('maps every shipped creature to a non-fallback sprite key', () => {
		for (const c of CREATURE_LIST) {
			// The monkey is both a real creature and the documented fallback.
			if (c.id === 'monkey') continue;
			expect(creatureTexture(c.id), `creature "${c.id}" falls back to the monkey`).not.toBe(
				SPRITE_KEYS.monkey
			);
		}
	});

	it('gives the komodo its own sprite', () => {
		expect(creatureTexture('komodo')).toBe(SPRITE_KEYS.komodo);
	});

	it('falls back to a monkey for unknown creatures', () => {
		expect(creatureTexture('does_not_exist')).toBe(SPRITE_KEYS.monkey);
	});
});
