import type { WeatherId } from '$types/core';
import { BALANCE } from '../config/balance';

/**
 * Weather system (see §10 / §46). Pure & deterministic: weather is a Markov-ish
 * walk over {@link WeatherId} driven by accumulated elapsed ms and a seeded RNG,
 * so the same seed replays identically and it survives save/load without drift.
 *
 * No Phaser/Svelte imports — fully unit-testable. The scene reads {@link current}
 * each frame for presentation; gameplay modifiers (rain water bonus, fire
 * efficiency, visibility) come from BALANCE.weather.
 */
export interface WeatherDefinition {
	id: WeatherId;
	/** Indonesian display name. */
	name: string;
	/** 0..1 visual opacity of the weather overlay (rain fog / storm darkening). */
	intensity: number;
}

export const WEATHER_LIST: WeatherDefinition[] = [
	{ id: 'clear', name: 'Cerah', intensity: 0 },
	{ id: 'wind', name: 'Berangin', intensity: 0.12 },
	{ id: 'rain', name: 'Hujan', intensity: 0.35 },
	{ id: 'storm', name: 'Badai', intensity: 0.6 },
	{ id: 'fog', name: 'Berkabut', intensity: 0.45 }
];

export function getWeather(id: WeatherId): WeatherDefinition | undefined {
	return WEATHER_LIST.find((w) => w.id === id);
}

/** Transition weights: weather id -> [nextId, weight][] (tuned for believable runs). */
const TRANSITIONS: Record<WeatherId, [WeatherId, number][]> = {
	clear: [
		['clear', 6],
		['wind', 3],
		['rain', 2],
		['fog', 1]
	],
	wind: [
		['wind', 4],
		['clear', 3],
		['rain', 3],
		['fog', 1]
	],
	rain: [
		['rain', 4],
		['storm', 2],
		['wind', 2],
		['clear', 2]
	],
	storm: [
		['storm', 2],
		['rain', 5],
		['wind', 2],
		['clear', 1]
	],
	fog: [
		['fog', 3],
		['clear', 3],
		['wind', 2],
		['rain', 1]
	]
};

/** A tiny deterministic 32-bit LCG so transitions are reproducible from a seed. */
function nextSeed(seed: number): number {
	return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

/** Pick the next weather id from `from` using the given uniform `roll` in [0,1). */
export function rollNextWeather(from: WeatherId, roll: number): WeatherId {
	const table = TRANSITIONS[from] ?? TRANSITIONS.clear;
	const total = table.reduce((acc, [, w]) => acc + w, 0);
	let pick = roll * total;
	for (const [id, w] of table) {
		pick -= w;
		if (pick < 0) return id;
	}
	return table[table.length - 1][0];
}

export class WeatherSystem {
	private id: WeatherId;
	private seed: number;
	/** Elapsed ms since the current weather began. */
	private elapsed = 0;
	/** When the current weather should end. */
	private duration: number;

	constructor(id: WeatherId = 'clear', seed = 1, elapsed = 0) {
		this.id = id;
		this.seed = seed >>> 0;
		this.duration = this.rollDuration();
		this.elapsed = elapsed;
	}

	get current(): WeatherId {
		return this.id;
	}

	/** 0..1 progress through the current weather's duration. */
	get progress(): number {
		return this.duration > 0 ? Math.min(1, this.elapsed / this.duration) : 1;
	}

	/** Advance by `deltaMs`; returns the new weather id if it changed, else null. */
	advance(deltaMs: number): WeatherId | null {
		if (deltaMs <= 0) return null;
		this.elapsed += deltaMs;
		if (this.elapsed < this.duration) return null;
		this.elapsed -= this.duration;
		this.seed = nextSeed(this.seed);
		const roll = (this.seed % 10000) / 10000;
		this.id = rollNextWeather(this.id, roll);
		this.duration = this.rollDuration();
		return this.id;
	}

	/** Reset elapsed on load (weather restarts its timer) — deterministic restore. */
	restore(id: WeatherId, seed: number, elapsed: number): void {
		this.id = id;
		this.seed = seed >>> 0;
		this.elapsed = elapsed;
		this.duration = this.rollDuration();
	}

	serialize(): WeatherSave {
		return { id: this.id, seed: this.seed, elapsed: this.elapsed };
	}

	/** A visibility multiplier in (0,1]: 1 = clear, lower = can see less. */
	visibility(): number {
		switch (this.id) {
			case 'storm':
				return BALANCE.weather.stormVisibility;
			case 'rain':
				return BALANCE.weather.rainVisibility;
			case 'fog':
				return BALANCE.weather.fogVisibility;
			default:
				return 1;
		}
	}

	private rollDuration(): number {
		const { minDurationMs, maxDurationMs } = BALANCE.weather;
		this.seed = nextSeed(this.seed);
		const t = (this.seed % 10000) / 10000;
		return Math.round(minDurationMs + t * (maxDurationMs - minDurationMs));
	}
}

export interface WeatherSave {
	id: WeatherId;
	seed: number;
	elapsed: number;
}
