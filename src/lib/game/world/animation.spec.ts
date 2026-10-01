import { describe, expect, it } from 'vitest';
import { bobPhaseFor, idleBobOffset } from './animation';
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
