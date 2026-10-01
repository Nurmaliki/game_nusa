import { BALANCE } from '../config/balance';

/**
 * Pure helpers for presentation "life" on static sprites (see §35).
 *
 * These are engine-free so they stay trivially unit-testable: the renderers add
 * the returned offset to a sprite's Y each frame. Keeping the math here (rather
 * than inline in a Phaser scene) means the animation curve is covered by tests.
 */

/**
 * Vertical idle "bob" offset in pixels for a sprite with the given stable phase.
 * A gentle sine so living things breathe without drifting.
 *
 * @param timeMs scene clock in milliseconds
 * @param phase  per-entity stable phase (e.g. a hash of its id) so entities
 *               don't bob in lockstep
 */
export function idleBobOffset(timeMs: number, phase = 0): number {
	const period = BALANCE.feedback.idleBobPeriodMs;
	const amp = BALANCE.feedback.idleBobPx;
	return Math.sin((timeMs / period) * Math.PI * 2 + phase) * amp;
}

/** A stable phase in [0, 2π) derived from a string id (deterministic). */
export function bobPhaseFor(id: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return ((h % 1000) / 1000) * Math.PI * 2;
}
