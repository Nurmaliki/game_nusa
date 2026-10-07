import { describe, expect, it } from 'vitest';
import { bobPhaseFor, coordPhase, idleBobOffset, swayDegrees } from './animation';
import { BALANCE } from '../config/balance';

describe('idleBobOffset', () => {
	it('stays within the configured amplitude', () => {
		const amp = BALANCE.feedback.idleBobPx;
		for (let t = 0; t < 5000; t += 37) {
			expect(Math.abs(idleBobOffset(t))).toBeLessThanOrEqual(amp + 1e-9);
		}
	});

	it('is zero at phase 0 and the start of a cycle', () => {
		expect(idleBobOffset(0)).toBeCloseTo(0, 6);
	});

	it('reaches the positive peak a quarter period in', () => {
		const quarter = BALANCE.feedback.idleBobPeriodMs / 4;
		expect(idleBobOffset(quarter)).toBeCloseTo(BALANCE.feedback.idleBobPx, 6);
	});

	it('shifts with the phase so entities do not move in lockstep', () => {
		const quarter = BALANCE.feedback.idleBobPeriodMs / 4;
		// At a quarter period phase 0 is at its peak; phase π is at its trough.
		expect(idleBobOffset(quarter, 0)).toBeCloseTo(BALANCE.feedback.idleBobPx, 6);
		expect(idleBobOffset(quarter, Math.PI)).toBeCloseTo(-BALANCE.feedback.idleBobPx, 6);
	});
});

describe('bobPhaseFor', () => {
	it('is deterministic for the same id', () => {
		expect(bobPhaseFor('crab_1')).toBe(bobPhaseFor('crab_1'));
	});

	it('returns a value in [0, 2π)', () => {
		for (const id of ['a', 'boar_2_3_1', 'tree_0_0_4', '']) {
			const p = bobPhaseFor(id);
			expect(p).toBeGreaterThanOrEqual(0);
			expect(p).toBeLessThan(Math.PI * 2 + 1e-9);
		}
	});

	it('generally differs across ids', () => {
		expect(bobPhaseFor('crab_1')).not.toBe(bobPhaseFor('crab_2'));
	});
});

describe('coordPhase', () => {
	it('is deterministic for the same coordinates', () => {
		expect(coordPhase(123.4, 567.8)).toBe(coordPhase(123.4, 567.8));
	});

	it('returns a value in [0, 2π)', () => {
		for (let i = 0; i < 50; i++) {
			const p = coordPhase(i * 97, i * 131);
			expect(p).toBeGreaterThanOrEqual(0);
			expect(p).toBeLessThan(Math.PI * 2 + 1e-9);
		}
	});

	it('varies across neighbouring coordinates (plants sway out of step)', () => {
		expect(coordPhase(100, 100)).not.toBe(coordPhase(132, 100));
	});
});

describe('swayDegrees', () => {
	it('stays within the configured amplitude', () => {
		const amp = BALANCE.feedback.swayAmpDeg;
		for (let t = 0; t < 12000; t += 53) {
			expect(Math.abs(swayDegrees(t, 0, amp))).toBeLessThanOrEqual(amp + 1e-9);
		}
	});

	it('is zero at the start of a cycle for phase 0', () => {
		expect(swayDegrees(0, 0)).toBeCloseTo(0, 6);
	});

	it('shifts with the phase so plants do not sway in lockstep', () => {
		const quarter = BALANCE.feedback.swayPeriodMs / 4;
		const amp = BALANCE.feedback.swayAmpDeg;
		expect(swayDegrees(quarter, 0, amp)).toBeCloseTo(amp, 6);
		expect(swayDegrees(quarter, Math.PI, amp)).toBeCloseTo(-amp, 6);
	});
});
