import { describe, it, expect } from 'vitest';
import {
	applyEffects,
	clamp,
	DEFAULT_CAPS,
	initialStats,
	isDead,
	respawnStats,
	tickSurvival
} from './survival';
import { BALANCE } from '../config/balance';

describe('survival basics', () => {
	it('starts full from balance config', () => {
		const s = initialStats();
		expect(s.health).toBe(BALANCE.player.startingHealth);
		expect(s.hunger).toBe(100);
	});

	it('clamp respects bounds', () => {
		expect(clamp(-5, 0, 100)).toBe(0);
		expect(clamp(150, 0, 100)).toBe(100);
		expect(clamp(50, 0, 100)).toBe(50);
	});
});

describe('tickSurvival', () => {
	it('drains hunger and thirst over time', () => {
		const s = initialStats();
		const t = tickSurvival(s, DEFAULT_CAPS, { gameHours: 1, sprinting: false });
		expect(t.hunger).toBeLessThan(s.hunger);
		expect(t.thirst).toBeLessThan(s.thirst);
	});

	it('damages health at zero hunger', () => {
		const s = { health: 100, hunger: 0, thirst: 50, energy: 50 };
		const t = tickSurvival(s, DEFAULT_CAPS, { gameHours: 1, sprinting: false });
		expect(t.health).toBeLessThan(100);
	});

	it('damages health more severely at zero thirst', () => {
		const zeroHunger = tickSurvival(
			{ health: 100, hunger: 0, thirst: 50, energy: 50 },
			DEFAULT_CAPS,
			{ gameHours: 1, sprinting: false }
		);
		const zeroThirst = tickSurvival(
			{ health: 100, hunger: 50, thirst: 0, energy: 50 },
			DEFAULT_CAPS,
			{ gameHours: 1, sprinting: false }
		);
		expect(100 - zeroThirst.health).toBeGreaterThan(100 - zeroHunger.health);
	});

	it('regenerates health when well fed and hydrated', () => {
		const s = { health: 50, hunger: 100, thirst: 100, energy: 50 };
		const t = tickSurvival(s, DEFAULT_CAPS, { gameHours: 1, sprinting: false });
		expect(t.health).toBeGreaterThan(50);
	});

	it('drains extra energy while sprinting', () => {
		const s = { health: 100, hunger: 100, thirst: 100, energy: 100 };
		const walk = tickSurvival(s, DEFAULT_CAPS, { gameHours: 0.1, sprinting: false });
		const sprint = tickSurvival(s, DEFAULT_CAPS, { gameHours: 0.1, sprinting: true });
		expect(sprint.energy).toBeLessThan(walk.energy);
	});

	it('restores energy while sleeping', () => {
		const s = { health: 100, hunger: 80, thirst: 80, energy: 10 };
		const t = tickSurvival(s, DEFAULT_CAPS, { gameHours: 1, sprinting: false, sleeping: true });
		expect(t.energy).toBeGreaterThan(10);
	});

	it('never exceeds caps', () => {
		const s = { health: 100, hunger: 100, thirst: 100, energy: 100 };
		const t = tickSurvival(s, DEFAULT_CAPS, { gameHours: 5, sprinting: false, sleeping: true });
		expect(t.energy).toBeLessThanOrEqual(100);
		expect(t.health).toBeLessThanOrEqual(100);
	});
});

describe('applyEffects', () => {
	it('applies food and drink effects', () => {
		const s = { health: 100, hunger: 50, thirst: 20, energy: 50 };
		const t = applyEffects(s, DEFAULT_CAPS, { hunger: 20, thirst: 30 });
		expect(t.hunger).toBe(70);
		expect(t.thirst).toBe(50);
	});

	it('clamps at max', () => {
		const s = { health: 100, hunger: 95, thirst: 95, energy: 50 };
		const t = applyEffects(s, DEFAULT_CAPS, { hunger: 50, thirst: 50 });
		expect(t.hunger).toBe(100);
		expect(t.thirst).toBe(100);
	});
});

describe('death & respawn', () => {
	it('detects death at zero health', () => {
		expect(isDead({ health: 0, hunger: 1, thirst: 1, energy: 1 })).toBe(true);
		expect(isDead({ health: 1, hunger: 0, thirst: 0, energy: 0 })).toBe(false);
	});

	it('respawns with configured values', () => {
		const r = respawnStats();
		expect(r.health).toBe(BALANCE.death.respawnHealth);
		expect(r.hunger).toBe(BALANCE.death.respawnHunger);
	});
});
