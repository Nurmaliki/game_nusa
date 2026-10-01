import { describe, expect, it } from 'vitest';
import {
	Achievements,
	achievementMet,
	achievementProgress,
	conditionMet,
	type ProgressSnapshot
} from './achievements';
import { ACHIEVEMENT_LIST, getAchievement } from '$data/achievements';
import { BIOME_LIST } from '$data/biomes';

function snap(over: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
	return {
		stats: {},
		skills: {},
		biomesVisited: 0,
		totalBiomes: BIOME_LIST.length,
		questsCompleted: 0,
		chaptersCompleted: 0,
		...over
	};
}

describe('conditionMet', () => {
	it('compares stats with >=', () => {
		const s = snap({ stats: { itemsGathered: 25 } });
		expect(conditionMet({ kind: 'stat', target: 'itemsGathered', count: 25 }, s)).toBe(true);
		expect(conditionMet({ kind: 'stat', target: 'itemsGathered', count: 26 }, s)).toBe(false);
	});
	it('treats missing stats/skills as 0', () => {
		expect(conditionMet({ kind: 'stat', target: 'nope', count: 1 }, snap())).toBe(false);
		expect(conditionMet({ kind: 'skill', target: 'fishing', count: 1 }, snap())).toBe(false);
	});
	it('handles quests, chapters and allBiomes', () => {
		expect(conditionMet({ kind: 'quests', count: 10 }, snap({ questsCompleted: 10 }))).toBe(true);
		expect(conditionMet({ kind: 'chapters', count: 2 }, snap({ chaptersCompleted: 2 }))).toBe(true);
		const all = snap({ biomesVisited: BIOME_LIST.length });
		expect(conditionMet({ kind: 'allBiomes', count: 4 }, all)).toBe(true);
		expect(conditionMet({ kind: 'allBiomes', count: 4 }, snap({ biomesVisited: 2 }))).toBe(false);
	});
});

describe('achievementMet / progress', () => {
	it('requires every condition', () => {
		const def = {
			id: 'x',
			name: '',
			description: '',
			conditions: [
				{ kind: 'stat' as const, target: 'a', count: 1 },
				{ kind: 'stat' as const, target: 'b', count: 1 }
			]
		};
		expect(achievementMet(def, snap({ stats: { a: 1 } }))).toBe(false);
		expect(achievementMet(def, snap({ stats: { a: 1, b: 1 } }))).toBe(true);
		expect(achievementProgress(def, snap({ stats: { a: 1 } }))).toBeCloseTo(0.5);
	});
});

describe('Achievements', () => {
	it('unlocks met achievements once and reports them in definition order', () => {
		const a = new Achievements();
		const fresh = a.evaluate(snap({ stats: { itemsGathered: 1000, itemsCrafted: 1000 } }));
		expect(fresh).toContain('first_steps');
		expect(fresh).toContain('forager');
		expect(fresh).toContain('craftsman');
		// Second evaluation unlocks nothing new.
		expect(a.evaluate(snap({ stats: { itemsGathered: 1000, itemsCrafted: 1000 } }))).toEqual([]);
		expect(a.has('first_steps')).toBe(true);
	});

	it('never relocks and is monotonic across snapshots', () => {
		const a = new Achievements();
		a.evaluate(snap({ stats: { itemsGathered: 25 } }));
		// A later, emptier snapshot must not remove it.
		a.evaluate(snap());
		expect(a.has('first_steps')).toBe(true);
	});

	it('serializes deterministically (sorted)', () => {
		const a = new Achievements(['b', 'a']);
		expect(a.serialize()).toEqual(['a', 'b']);
	});

	it('restores from a serialized list', () => {
		const a = new Achievements(['first_steps']);
		expect(a.has('first_steps')).toBe(true);
		expect(a.evaluate(snap({ stats: { itemsGathered: 25 } }))).not.toContain('first_steps');
	});
});

describe('ACHIEVEMENT_LIST integrity', () => {
	it('has unique ids and at least one condition each', () => {
		const ids = new Set(ACHIEVEMENT_LIST.map((a) => a.id));
		expect(ids.size).toBe(ACHIEVEMENT_LIST.length);
		for (const a of ACHIEVEMENT_LIST) expect(a.conditions.length).toBeGreaterThan(0);
	});
	it('every referenced skill id is a real skill', () => {
		const skills = new Set(['gathering', 'crafting', 'survival', 'combat', 'fishing']);
		for (const a of ACHIEVEMENT_LIST) {
			for (const c of a.conditions) {
				if (c.kind === 'skill')
					expect(skills.has(c.target ?? ''), `${a.id} references unknown skill "${c.target}"`).toBe(
						true
					);
			}
		}
	});
	it('getAchievement resolves known ids', () => {
		expect(getAchievement('first_steps')).toBeDefined();
		expect(getAchievement('nope')).toBeUndefined();
	});
});
