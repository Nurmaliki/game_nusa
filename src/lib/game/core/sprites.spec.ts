import { describe, expect, it } from 'vitest';
import {
	creatureTexture,
	buildingTexture,
	resourceTexture,
	playerFacingTexture,
	SPRITE_KEYS
} from './sprite-keys';
import { RESOURCE_NODE_LIST } from '$data/resources';
import { CREATURE_LIST } from '$data/creatures';
import { BUILDING_LIST } from '$data/buildings';

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

describe('buildingTexture', () => {
	it('maps every shipped building to a distinct, non-fallback sprite key', () => {
		for (const b of BUILDING_LIST) {
			const key = buildingTexture(b.id);
			// The generic storage sprite is the documented fallback; no real
			// building should silently fall through to it unless it maps there.
			const expectedFallback = b.id === 'storage' || b.id === 'storage_chest';
			if (!expectedFallback) {
				expect(key, `building "${b.id}" falls back to the storage sprite`).not.toBe(
					SPRITE_KEYS.storage
				);
			}
		}
	});

	it('gives the campfire its dedicated sprite', () => {
		expect(buildingTexture('campfire')).toBe(SPRITE_KEYS.campfire);
	});

	it('falls back to the generic storage sprite for unknown buildings', () => {
		expect(buildingTexture('does_not_exist')).toBe(SPRITE_KEYS.storage);
	});
});

describe('playerFacingTexture', () => {
	it('faces down (front art) for downward movement', () => {
		expect(playerFacingTexture({ x: 0, y: 1 })).toEqual({
			key: SPRITE_KEYS.playerDown,
			flipX: false
		});
	});

	it('faces up (back art) for upward movement', () => {
		expect(playerFacingTexture({ x: 0, y: -1 })).toEqual({
			key: SPRITE_KEYS.playerUp,
			flipX: false
		});
	});

	it('uses right-facing side art (unflipped) for rightward movement', () => {
		expect(playerFacingTexture({ x: 1, y: 0 })).toEqual({
			key: SPRITE_KEYS.playerSide,
			flipX: false
		});
	});

	it('mirrors the side art for leftward movement', () => {
		expect(playerFacingTexture({ x: -1, y: 0 })).toEqual({
			key: SPRITE_KEYS.playerSide,
			flipX: true
		});
	});

	it('prefers the horizontal art on diagonal movement (dominant axis)', () => {
		expect(playerFacingTexture({ x: 0.7, y: 0.5 }).key).toBe(SPRITE_KEYS.playerSide);
		expect(playerFacingTexture({ x: 0.7, y: -0.5 }).key).toBe(SPRITE_KEYS.playerSide);
	});

	it('faces down for a shallow downward diagonal', () => {
		expect(playerFacingTexture({ x: 0.3, y: 0.9 }).key).toBe(SPRITE_KEYS.playerDown);
	});
});
