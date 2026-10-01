import { describe, it, expect } from 'vitest';
import { Skills, xpForLevel, levelForXp, SKILL_IDS } from './skills';
import type { SkillSave } from '$types/save';

describe('xpForLevel', () => {
	it('level 1 requires 0 xp', () => {
		expect(xpForLevel(1)).toBe(0);
	});
	it('is monotonically increasing', () => {
		for (let l = 1; l < 10; l++) {
			expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
		}
	});
});

describe('levelForXp', () => {
	it('maps 0 xp to level 1', () => {
		expect(levelForXp(0)).toBe(1);
	});
	it('caps at the configured max level', () => {
		expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(20);
	});
	it('round-trips with xpForLevel', () => {
		for (let l = 1; l <= 10; l++) {
			expect(levelForXp(xpForLevel(l))).toBe(l);
		}
	});
});

describe('Skills', () => {
	it('starts every skill at level 1 / 0 xp', () => {
		const s = new Skills();
		for (const id of SKILL_IDS) {
			expect(s.level(id)).toBe(1);
			expect(s.xp(id)).toBe(0);
		}
	});

	it('awards xp and levels up, reporting gained levels', () => {
		const s = new Skills();
		const needed = xpForLevel(2);
		const gained = s.award('crafting', needed);
		expect(gained).toBe(1);
		expect(s.level('crafting')).toBe(2);
	});

	it('ignores non-positive xp awards', () => {
		const s = new Skills();
		expect(s.award('combat', 0)).toBe(0);
		expect(s.award('combat', -5)).toBe(0);
		expect(s.xp('combat')).toBe(0);
	});

	it('reports progress toward the next level in [0,1)', () => {
		const s = new Skills();
		s.award('fishing', Math.floor(xpForLevel(2) / 2));
		const p = s.progress('fishing');
		expect(p).toBeGreaterThan(0);
		expect(p).toBeLessThan(1);
	});

	it('checks requirements via meets()', () => {
		const s = new Skills();
		expect(s.meets('crafting', 1)).toBe(true);
		expect(s.meets('crafting', 3)).toBe(false);
		s.award('crafting', xpForLevel(3));
		expect(s.meets('crafting', 3)).toBe(true);
	});

	it('round-trips through serialize/deserialize', () => {
		const s = new Skills();
		s.award('gathering', xpForLevel(4));
		const data: SkillSave[] = s.serialize();
		const s2 = new Skills();
		s2.deserialize(data);
		expect(s2.level('gathering')).toBe(s.level('gathering'));
		expect(s2.xp('gathering')).toBe(s.xp('gathering'));
	});

	it('ignores unknown skills during deserialize', () => {
		const s = new Skills();
		s.deserialize([{ id: 'bogus', level: 9, xp: 9999 }]);
		expect(s.xp('crafting')).toBe(0);
	});

	it('records level-ups for draining, once per gain', () => {
		const s = new Skills();
		expect(s.drainLevelUps()).toEqual([]);
		s.award('crafting', xpForLevel(2));
		const gains = s.drainLevelUps();
		expect(gains).toEqual([{ id: 'crafting', level: 2 }]);
		// Drained: a second call returns nothing until the next level-up.
		expect(s.drainLevelUps()).toEqual([]);
	});

	it('does not record a level-up when xp does not cross a threshold', () => {
		const s = new Skills();
		s.award('gathering', 1);
		expect(s.drainLevelUps()).toEqual([]);
	});

	it('snapshot reflects current level and xp for every skill', () => {
		const s = new Skills();
		s.award('combat', xpForLevel(3));
		const snap = s.snapshot();
		expect(snap).toHaveLength(SKILL_IDS.length);
		const combat = snap.find((e) => e.id === 'combat');
		expect(combat?.level).toBe(3);
		expect(combat?.xp).toBe(xpForLevel(3));
	});
});
