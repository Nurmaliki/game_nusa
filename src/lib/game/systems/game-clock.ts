import type { DayPhase } from '$types/core';
import { BALANCE } from '../config/balance';

/**
 * Internal simulation clock (§10). Derives in-game time from accumulated
 * elapsed milliseconds — NEVER from the device system clock.
 */
export class GameClock {
	private elapsedMs: number;
	private readonly msPerDay: number;

	constructor(elapsedMs = 0, msPerDay: number = BALANCE.dayNight.msPerGameDay) {
		this.elapsedMs = elapsedMs;
		this.msPerDay = msPerDay;
	}

	/** Advance the clock. Only call while the simulation is running (not paused). */
	advance(deltaMs: number): void {
		this.elapsedMs += deltaMs;
	}

	get totalMs(): number {
		return this.elapsedMs;
	}

	/** In-game day number (1-based). */
	get day(): number {
		return Math.floor(this.elapsedMs / this.msPerDay) + 1;
	}

	/** Fraction of the current day, 0 = midnight, 0.5 = noon. */
	get dayFraction(): number {
		return (this.elapsedMs % this.msPerDay) / this.msPerDay;
	}

	/** In-game hour as a float 0..24. */
	get hour(): number {
		return this.dayFraction * 24;
	}

	/** Phase of the day based on the hour thresholds from the spec. */
	get phase(): DayPhase {
		const h = this.hour;
		if (h < 5) return 'midnight';
		if (h < 6) return 'dawn';
		if (h < 8) return 'sunrise';
		if (h < 12) return 'morning';
		if (h < 18) return 'midday';
		if (h < 20) return 'sunset';
		return 'night';
	}

	/** Formatted 24h clock "HH:MM". */
	get clockString(): string {
		const totalMinutes = Math.floor(this.dayFraction * 24 * 60);
		const hh = Math.floor(totalMinutes / 60)
			.toString()
			.padStart(2, '0');
		const mm = (totalMinutes % 60).toString().padStart(2, '0');
		return `${hh}:${mm}`;
	}

	serialize(): number {
		return this.elapsedMs;
	}
}

/** Ambient darkness (0 = full day, 1 = deep night) for tinting the world. */
export function darknessForHour(hour: number): number {
	// Smooth curve: darkest at midnight, brightest at midday.
	const angle = ((hour - 12) / 24) * Math.PI * 2;
	const v = (Math.cos(angle) + 1) / 2; // 1 at noon, 0 at midnight
	return 1 - v;
}
