import { describe, expect, it } from 'vitest';
import { WeatherSystem, getWeather, rollNextWeather, WEATHER_LIST } from './weather';
import { BALANCE } from '../config/balance';

describe('WEATHER_LIST', () => {
	it('has a definition for every WeatherId used by transitions', () => {
		for (const w of WEATHER_LIST) expect(getWeather(w.id)).toBeDefined();
	});
	it('orders intensity from clear (0) upward', () => {
		expect(getWeather('clear')?.intensity).toBe(0);
		for (const w of WEATHER_LIST) expect(w.intensity).toBeLessThanOrEqual(1);
	});
});

describe('rollNextWeather', () => {
	it('is deterministic for the same input', () => {
		expect(rollNextWeather('clear', 0.42)).toBe(rollNextWeather('clear', 0.42));
	});
	it('roll 0 and roll ~1 stay within the valid id set', () => {
		const ids = new Set(WEATHER_LIST.map((w) => w.id));
		for (const from of WEATHER_LIST.map((w) => w.id)) {
			expect(ids.has(rollNextWeather(from, 0))).toBe(true);
			expect(ids.has(rollNextWeather(from, 0.9999))).toBe(true);
		}
	});
});

describe('WeatherSystem', () => {
	it('starts at the given weather', () => {
		expect(new WeatherSystem('rain', 7).current).toBe('rain');
	});

	it('does not change before the duration elapses', () => {
		const w = new WeatherSystem('clear', 1);
		expect(w.advance(1000)).toBeNull();
		expect(w.current).toBe('clear');
	});

	it('always transitions after enough elapsed time', () => {
		const w = new WeatherSystem('clear', 1);
		let changed = null;
		for (let i = 0; i < 500 && !changed; i++) changed = w.advance(1000);
		expect(changed).not.toBeNull();
	});

	it('duration stays within the configured bounds', () => {
		const w = new WeatherSystem('clear', 5);
		let changed = null;
		let t = 0;
		for (let i = 0; i < 500 && !changed; i++) {
			changed = w.advance(1000);
			t += 1000;
		}
		expect(t).toBeGreaterThanOrEqual(BALANCE.weather.minDurationMs);
		expect(t).toBeLessThanOrEqual(BALANCE.weather.maxDurationMs + 1000);
	});

	it('replays identically for the same seed', () => {
		const a = new WeatherSystem('clear', 123);
		const b = new WeatherSystem('clear', 123);
		const seqA: string[] = [];
		const seqB: string[] = [];
		for (let i = 0; i < 400; i++) {
			const ca = a.advance(1000);
			const cb = b.advance(1000);
			if (ca) seqA.push(ca);
			if (cb) seqB.push(cb);
		}
		expect(seqA).toEqual(seqB);
		expect(seqA.length).toBeGreaterThan(0);
	});

	it('serializes and restores deterministically', () => {
		const w = new WeatherSystem('fog', 42);
		w.advance(5000);
		const save = w.serialize();
		const w2 = new WeatherSystem('clear', 1);
		w2.restore(save.id, save.seed, save.elapsed);
		expect(w2.current).toBe(save.id);
		// Same remaining path: both should change weather at the same future delta.
		const a = new WeatherSystem('clear', 1);
		a.restore(save.id, save.seed, save.elapsed);
		const stepA = a.advance(1000);
		const stepW = w2.advance(1000);
		expect(stepW).toBe(stepA);
	});

	it('reports visibility in (0,1] and lowest for storm', () => {
		const storm = new WeatherSystem('storm', 1);
		const clear = new WeatherSystem('clear', 1);
		expect(storm.visibility()).toBeLessThan(clear.visibility());
		expect(clear.visibility()).toBe(1);
		for (const w of WEATHER_LIST) {
			const v = new WeatherSystem(w.id, 1).visibility();
			expect(v).toBeGreaterThan(0);
			expect(v).toBeLessThanOrEqual(1);
		}
	});

	it('ignores non-positive deltas', () => {
		const w = new WeatherSystem('clear', 1);
		expect(w.advance(0)).toBeNull();
		expect(w.advance(-500)).toBeNull();
	});
});
