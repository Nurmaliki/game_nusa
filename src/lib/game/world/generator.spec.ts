import { describe, it, expect } from 'vitest';
import { hashString, mulberry32, weightedPick } from './generator';

describe('mulberry32', () => {
	it('is deterministic for a given seed', () => {
		const a = mulberry32(123);
		const b = mulberry32(123);
		for (let i = 0; i < 10; i++) expect(a()).toBe(b());
	});

	it('produces values in [0,1)', () => {
		const rng = mulberry32(7);
		for (let i = 0; i < 100; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it('different seeds diverge', () => {
		expect(mulberry32(1)()).not.toBe(mulberry32(2)());
	});
});

describe('hashString', () => {
	it('is stable and case-sensitive', () => {
		expect(hashString('hello')).toBe(hashString('hello'));
		expect(hashString('hello')).not.toBe(hashString('Hello'));
	});
});

describe('weightedPick', () => {
	it('always returns a valid key', () => {
		const weights = { a: 1, b: 2, c: 7 };
		for (let i = 0; i < 50; i++) {
			expect(Object.keys(weights)).toContain(weightedPick(weights, mulberry32(i)));
		}
	});

	it('respects zero-weight keys being unpicked at roll 0', () => {
		// With rng() -> 0 the roll lands on the first key.
		expect(weightedPick({ a: 5, b: 0 }, () => 0)).toBe('a');
	});
});
