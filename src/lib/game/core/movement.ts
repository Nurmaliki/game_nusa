import type { Vec2 } from '$types/core';

/** Pure helpers for movement so they can be unit-tested without Phaser. */

/** Clamp a vector's magnitude to `max` (returns a new vector). */
export function clampMagnitude(v: Vec2, max: number): Vec2 {
	const len = Math.hypot(v.x, v.y);
	if (len <= max || len === 0) return { x: v.x, y: v.y };
	const s = max / len;
	return { x: v.x * s, y: v.y * s };
}

/** Normalise a vector to unit length (returns {0,0} for a zero vector). */
export function normalize(v: Vec2): Vec2 {
	const len = Math.hypot(v.x, v.y);
	if (len < 1e-6) return { x: 0, y: 0 };
	return { x: v.x / len, y: v.y / len };
}

/**
 * Resolve the player's target velocity from movement input and modifiers.
 * Sprinting is only allowed while moving and while the player has energy.
 */
export function resolveMoveVelocity(
	move: Vec2,
	sprint: boolean,
	canSprint: boolean,
	walkSpeed: number,
	sprintSpeed: number
): Vec2 {
	const dir = normalize(move);
	if (dir.x === 0 && dir.y === 0) return { x: 0, y: 0 };
	const speed = sprint && canSprint ? sprintSpeed : walkSpeed;
	return { x: dir.x * speed, y: dir.y * speed };
}
