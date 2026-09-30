import { describe, it, expect } from 'vitest';
import { QuestLog, evaluateQuest, initProgress, emptySnapshot, consumedItems } from './quests';
import { getQuest, QUEST_LIST } from '$data/quests';

function snapshot(partial: Partial<ReturnType<typeof emptySnapshot>>) {
	return { ...emptySnapshot(), ...partial };
}

describe('QuestLog availability', () => {
	it('starts every quest LOCKED', () => {
		const log = new QuestLog();
		for (const q of QUEST_LIST) expect(log.state(q.id)).toBe('LOCKED');
	});

	it('unlocks root quests with no prerequisites', () => {
		const log = new QuestLog();
		const unlocked = log.refreshAvailability();
		expect(unlocked).toContain('chapter1_start');
		expect(log.state('chapter1_start')).toBe('AVAILABLE');
	});

	it('keeps gated quests locked until prerequisites complete', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		expect(log.state('chapter1_gather')).toBe('LOCKED');
	});
});

describe('QuestLog accept & progress', () => {
	it('accepts an available quest', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		const r = log.accept('chapter1_start');
		expect(r.ok).toBe(true);
		expect(log.state('chapter1_start')).toBe('ACTIVE');
	});

	it('rejects accepting a locked quest', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		expect(log.accept('chapter1_gather').ok).toBe(false);
	});

	it('marks a quest COMPLETABLE when objectives are met', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		log.accept('chapter1_start');
		const snap = snapshot({
			counts: { wood: 10, stone: 5 },
			built: { campfire: 1 }
		});
		log.update(snap);
		expect(log.state('chapter1_start')).toBe('COMPLETABLE');
	});

	it('does not complete early if an objective is short', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		log.accept('chapter1_start');
		log.update(snapshot({ counts: { wood: 10, stone: 1 }, built: { campfire: 1 } }));
		expect(log.state('chapter1_start')).toBe('ACTIVE');
	});

	it('turn-in completes the quest and unlocks the next', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		log.accept('chapter1_start');
		log.update(snapshot({ counts: { wood: 10, stone: 5 }, built: { campfire: 1 } }));
		const r = log.turnIn('chapter1_start');
		expect(r.ok).toBe(true);
		expect(log.state('chapter1_start')).toBe('COMPLETED');
		// chapter1_gather requires chapter1_start.
		expect(log.state('chapter1_gather')).toBe('AVAILABLE');
	});

	it('cannot turn in a quest that is not completable', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		log.accept('chapter1_start');
		expect(log.turnIn('chapter1_start').ok).toBe(false);
	});
});

describe('quest helpers', () => {
	it('initProgress marks LOCKED and zeroes objectives', () => {
		const def = getQuest('chapter1_start')!;
		const p = initProgress(def);
		expect(p.state).toBe('LOCKED');
		expect(p.objectives.every((o) => o.current === 0 && !o.complete)).toBe(true);
	});

	it('evaluateQuest is a no-op for LOCKED quests', () => {
		const def = getQuest('chapter1_start')!;
		const p = initProgress(def, 'LOCKED');
		const out = evaluateQuest(p, snapshot({ counts: { wood: 999 } }));
		expect(out.state).toBe('LOCKED');
	});

	it('consumedItems lists only consume gather/craft objectives', () => {
		const def = getQuest('chapter1_start')!;
		const items = consumedItems(def);
		expect(items).toEqual([
			{ id: 'wood', qty: 10 },
			{ id: 'stone', qty: 5 }
		]);
	});

	it('serialize/deserialize round-trips state', () => {
		const log = new QuestLog();
		log.refreshAvailability();
		log.accept('chapter1_start');
		log.update(snapshot({ counts: { wood: 10, stone: 5 }, built: { campfire: 1 } }));
		const data = log.serialize();
		const log2 = new QuestLog();
		log2.deserialize(data);
		expect(log2.state('chapter1_start')).toBe('COMPLETABLE');
	});
});
