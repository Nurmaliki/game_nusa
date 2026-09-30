import { describe, it, expect } from 'vitest';
import { GameClock, darknessForHour } from './game-clock';

describe('GameClock', () => {
	const MS_PER_DAY = 1_440_000; // 24 real minutes

	it('starts at day 1', () => {
		const c = new GameClock(0, MS_PER_DAY);
		expect(c.day).toBe(1);
		expect(c.clockString).toBe('00:00');
	});

	it('advances a full day and increments the day counter', () => {
		const c = new GameClock(0, MS_PER_DAY);
		c.advance(MS_PER_DAY);
		expect(c.day).toBe(2);
		expect(c.clockString).toBe('00:00');
	});

	it('maps 1 real second to ~1 in-game minute', () => {
		const c = new GameClock(0, MS_PER_DAY);
		// 1/60 of an hour = 1 minute of game time => advance 1/24/60 of a day.
		c.advance(MS_PER_DAY / 24 / 60);
		expect(c.clockString).toBe('00:01');
	});

	it('reports the correct phase at noon', () => {
		const c = new GameClock((12 / 24) * MS_PER_DAY, MS_PER_DAY);
		expect(c.phase).toBe('midday');
	});

	it('reports night after 20:00', () => {
		const c = new GameClock((21 / 24) * MS_PER_DAY, MS_PER_DAY);
		expect(c.phase).toBe('night');
	});

	it('reports midnight before 05:00', () => {
		const c = new GameClock((2 / 24) * MS_PER_DAY, MS_PER_DAY);
		expect(c.phase).toBe('midnight');
	});

	it('serializes and restores elapsed time', () => {
		const c = new GameClock(123456, MS_PER_DAY);
		const restored = new GameClock(c.serialize(), MS_PER_DAY);
		expect(restored.totalMs).toBe(123456);
	});
});

describe('darknessForHour', () => {
	it('is brightest at noon', () => {
		expect(darknessForHour(12)).toBeCloseTo(0, 5);
	});

	it('is darkest at midnight', () => {
		expect(darknessForHour(0)).toBeCloseTo(1, 5);
	});

	it('always stays within [0,1]', () => {
		for (let h = 0; h <= 24; h += 0.5) {
			const d = darknessForHour(h);
			expect(d).toBeGreaterThanOrEqual(0);
			expect(d).toBeLessThanOrEqual(1);
		}
	});
});
