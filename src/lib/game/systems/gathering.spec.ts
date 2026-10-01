import { describe, it, expect } from 'vitest';
import { applySwing, gatherPower, isPreferredTool, respawnHours, rollYield } from './gathering';
import { getResourceNode } from '$data/resources';
import { getItem } from '$data/items';

const tree = getResourceNode('tree')!;
const axe = getItem('stone_axe')!.tool!;
const pickaxe = getItem('stone_pickaxe')!.tool!;

describe('gatherPower', () => {
	it('bare hands always work but slowly', () => {
		expect(gatherPower(tree, null)).toBe(1);
	});

	it('preferred tool gives full power', () => {
		expect(gatherPower(tree, axe)).toBeGreaterThan(1);
	});

	it('wrong tool is reduced but not blocked', () => {
		const wrong = gatherPower(tree, pickaxe);
		expect(wrong).toBeGreaterThanOrEqual(1);
		expect(wrong).toBeLessThan(axe.gatherPower);
	});
});

describe('isPreferredTool', () => {
	it('is true for matching tool', () => {
		expect(isPreferredTool(tree, axe)).toBe(true);
	});
	it('is false for mismatched tool', () => {
		expect(isPreferredTool(tree, pickaxe)).toBe(false);
	});
	it('is true for nodes with no preference', () => {
		expect(isPreferredTool(getResourceNode('palm')!, null)).toBe(true);
	});
});

describe('applySwing', () => {
	it('reduces work and completes at zero', () => {
		const r1 = applySwing(tree, 3, axe);
		expect(r1.completed).toBe(false);
		expect(r1.workRemaining).toBeLessThan(3);
		const r2 = applySwing(tree, 1, axe);
		expect(r2.completed).toBe(true);
		expect(r2.workRemaining).toBe(0);
	});

	it('charges tool durability but not for bare hands', () => {
		expect(applySwing(tree, 3, axe).durabilityCost).toBeGreaterThan(0);
		expect(applySwing(tree, 3, null).durabilityCost).toBe(0);
	});
});

describe('rollYield', () => {
	it('is deterministic with an injected rng', () => {
		const a = rollYield(tree, () => 0);
		const b = rollYield(tree, () => 0);
		expect(a).toEqual(b);
		expect(a[0].itemId).toBe('wood');
		expect(a[0].qty).toBeGreaterThanOrEqual(2);
	});

	it('never yields negative quantities', () => {
		const rolls = rollYield(getResourceNode('bush')!, () => 0.99);
		expect(rolls.every((r) => r.qty > 0)).toBe(true);
	});

	it('applies a positive modifier (e.g. rain for fishing)', () => {
		const plain = rollYield(getResourceNode('fish_shoal')!, () => 0.5);
		const boosted = rollYield(getResourceNode('fish_shoal')!, () => 0.5, 1.5);
		expect(boosted[0].qty).toBeGreaterThanOrEqual(plain[0].qty);
	});

	it('modifier 1 is a no-op', () => {
		expect(rollYield(tree, () => 0.3, 1)).toEqual(rollYield(tree, () => 0.3));
	});
});

describe('respawnHours', () => {
	it('returns hours for respawning nodes', () => {
		expect(respawnHours(tree)).toBe(12);
	});
	it('returns null for never-respawning nodes', () => {
		expect(respawnHours({ ...tree, respawn: { mode: 'never' } })).toBeNull();
	});
});
