import { describe, it, expect } from 'vitest';
import {
	resolveAttack,
	combatSkillMultiplier,
	stepCreatureAi,
	applyDamageToPlayer,
	applyDamageToCreature,
	rollLoot,
	inAttackRange,
	type CreatureRuntime,
	type AttackRequest
} from './combat';
import { getCreature } from '$data/creatures';
import { getItem } from '$data/items';
import { BALANCE } from '../config/balance';

/** Deterministic RNG for reproducible tests. */
function seq(values: number[]): () => number {
	let i = 0;
	return () => values[i++ % values.length];
}

describe('combatSkillMultiplier', () => {
	it('is 1 at level 1 and grows with level', () => {
		expect(combatSkillMultiplier(1)).toBe(1);
		expect(combatSkillMultiplier(5)).toBeGreaterThan(combatSkillMultiplier(1));
	});
});

describe('resolveAttack', () => {
	const rngNever = () => 0.99; // never crit
	const rngAlways = () => 0; // always crit

	it('uses unarmed damage and range without a weapon', () => {
		const req: AttackRequest = { kind: 'light', weapon: null, combatLevel: 1 };
		const res = resolveAttack(req, rngNever);
		expect(res.damage).toBe(BALANCE.combat.baseUnarmedDamage);
		expect(res.range).toBe(BALANCE.combat.unarmedRange);
		expect(res.durabilityCost).toBe(0);
	});

	it('applies a critical hit multiplier', () => {
		const weapon = getItem('iron_sword')!.weapon!;
		const normal = resolveAttack({ kind: 'light', weapon, combatLevel: 1 }, rngNever);
		const crit = resolveAttack({ kind: 'light', weapon, combatLevel: 1 }, rngAlways);
		expect(crit.isCritical).toBe(true);
		expect(crit.damage).toBeGreaterThan(normal.damage);
	});

	it('heavy attacks cost energy and hit harder', () => {
		const weapon = getItem('machete')!.weapon!;
		const light = resolveAttack({ kind: 'light', weapon, combatLevel: 1 }, rngNever);
		const heavy = resolveAttack({ kind: 'heavy', weapon, combatLevel: 1 }, rngNever);
		expect(heavy.damage).toBeGreaterThan(light.damage);
		expect(heavy.energyCost).toBe(BALANCE.combat.heavyEnergyCost);
	});

	it('scales damage with the combat skill', () => {
		const weapon = getItem('iron_sword')!.weapon!;
		const low = resolveAttack({ kind: 'light', weapon, combatLevel: 1 }, rngNever);
		const high = resolveAttack({ kind: 'light', weapon, combatLevel: 10 }, rngNever);
		expect(high.damage).toBeGreaterThan(low.damage);
	});
});

describe('applyDamageToPlayer', () => {
	it('reduces damage by armor and clamps health at zero', () => {
		const r = applyDamageToPlayer(100, 50, 0.5, { x: 0, y: 0 }, { x: 10, y: 0 }, 0);
		expect(r.health).toBe(75);
	});

	it('full armor reduction nullifies damage', () => {
		const r = applyDamageToPlayer(100, 50, 1, { x: 0, y: 0 }, { x: 10, y: 0 }, 0);
		expect(r.health).toBe(100);
	});

	it('produces a knockback vector away from the source', () => {
		const r = applyDamageToPlayer(100, 10, 0, { x: 0, y: 0 }, { x: 10, y: 0 }, 100);
		expect(r.knockback.x).toBeGreaterThan(0);
	});
});

describe('applyDamageToCreature', () => {
	it('clamps at zero', () => {
		expect(applyDamageToCreature(10, 999)).toBe(0);
		expect(applyDamageToCreature(10, 4)).toBe(6);
	});
});

describe('inAttackRange', () => {
	it('is true within range and false beyond', () => {
		expect(inAttackRange({ x: 0, y: 0 }, { x: 10, y: 0 }, 20)).toBe(true);
		expect(inAttackRange({ x: 0, y: 0 }, { x: 100, y: 0 }, 20)).toBe(false);
	});
});

describe('rollLoot', () => {
	it('drops guaranteed entries and respects chance', () => {
		const entry = [{ itemId: 'meat', chance: 1, min: 1, max: 1 }];
		expect(rollLoot(entry, seq([0]))).toEqual([{ id: 'meat', qty: 1 }]);
	});

	it('skips entries that miss the chance roll', () => {
		const entry = [{ itemId: 'hide', chance: 0.2, min: 1, max: 1 }];
		expect(rollLoot(entry, seq([0.9]))).toHaveLength(0);
	});
});

describe('creature AI', () => {
	const def = getCreature('boar')!;

	function runtime(overrides: Partial<CreatureRuntime> = {}): CreatureRuntime {
		return {
			definitionId: 'boar',
			position: { x: 0, y: 0 },
			home: { x: 0, y: 0 },
			health: def.health,
			maxHealth: def.health,
			state: 'idle',
			lastAttackMs: 0,
			wanderTarget: null,
			...overrides
		};
	}

	it('chases the player when within aggro radius', () => {
		const c = runtime();
		const { creature, move } = stepCreatureAi(
			c,
			def,
			{ playerPos: { x: 50, y: 0 }, playerAlive: true, now: 1000 },
			seq([0.5])
		);
		expect(creature.state).toBe('chase');
		expect(move.x).toBeGreaterThan(0);
	});

	it('attacks once within attack range and respects cooldown', () => {
		const c = runtime({ state: 'chase', position: { x: 0, y: 0 } });
		const first = stepCreatureAi(
			c,
			def,
			{ playerPos: { x: 10, y: 0 }, playerAlive: true, now: 5000 },
			seq([0.5])
		);
		expect(first.creature.state).toBe('attack');
		expect(first.attack).toBe(true);
		expect(first.creature.lastAttackMs).toBe(5000);

		// Immediately again: still in cooldown -> no attack.
		const second = stepCreatureAi(
			first.creature,
			def,
			{ playerPos: { x: 10, y: 0 }, playerAlive: true, now: 5100 },
			seq([0.5])
		);
		expect(second.attack).toBe(false);
	});

	it('gives up when the player is beyond the leash', () => {
		// Creature is away from home and the player is far: it should break off.
		const c = runtime({ state: 'chase', position: { x: 300, y: 0 } });
		const { creature } = stepCreatureAi(
			c,
			def,
			{ playerPos: { x: def.leash + 1000, y: 0 }, playerAlive: true, now: 1000 },
			seq([0.5])
		);
		expect(creature.state).not.toBe('chase');
		expect(creature.state).not.toBe('attack');
	});

	it('does nothing when dead', () => {
		const c = runtime({ state: 'dead' });
		const { creature, attack } = stepCreatureAi(
			c,
			def,
			{ playerPos: { x: 5, y: 0 }, playerAlive: true, now: 1000 },
			seq([0.5])
		);
		expect(creature.state).toBe('dead');
		expect(attack).toBe(false);
	});

	it('passive creatures never enter chase', () => {
		const crab = getCreature('crab')!;
		const c = runtime({ definitionId: 'crab', state: 'idle' });
		const { creature } = stepCreatureAi(
			c,
			crab,
			{ playerPos: { x: 5, y: 0 }, playerAlive: true, now: 1000 },
			seq([0.5])
		);
		expect(creature.state).not.toBe('chase');
	});

	it('skittish creatures flee an approaching player', () => {
		const gull = getCreature('seagull')!;
		const c = runtime({ definitionId: 'seagull', state: 'idle' });
		const { creature } = stepCreatureAi(
			c,
			gull,
			{ playerPos: { x: 10, y: 0 }, playerAlive: true, now: 1000 },
			seq([0.5])
		);
		expect(creature.state).toBe('flee');
	});
});
