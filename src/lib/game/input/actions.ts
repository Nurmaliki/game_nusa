import type { Vec2 } from '$types/core';

/**
 * Abstract input actions (§32). Gameplay logic reads ACTIONS, never keycodes.
 * Remapping is done by editing ACTION_BINDINGS.
 */
export type InputAction =
	| 'MOVE_UP'
	| 'MOVE_DOWN'
	| 'MOVE_LEFT'
	| 'MOVE_RIGHT'
	| 'SPRINT'
	| 'INTERACT'
	| 'ATTACK'
	| 'HEAVY_ATTACK'
	| 'BLOCK'
	| 'DODGE'
	| 'INVENTORY'
	| 'CRAFTING'
	| 'BUILD'
	| 'ROTATE'
	| 'QUESTS'
	| 'MAP'
	| 'PAUSE'
	| 'HOTBAR_1'
	| 'HOTBAR_2'
	| 'HOTBAR_3'
	| 'HOTBAR_4'
	| 'HOTBAR_5';

/** Keyboard-event-key -> action. Multiple keys may map to one action. */
export const ACTION_BINDINGS: Record<string, InputAction> = {
	w: 'MOVE_UP',
	arrowup: 'MOVE_UP',
	s: 'MOVE_DOWN',
	arrowdown: 'MOVE_DOWN',
	a: 'MOVE_LEFT',
	arrowleft: 'MOVE_LEFT',
	d: 'MOVE_RIGHT',
	arrowright: 'MOVE_RIGHT',
	shift: 'SPRINT',
	e: 'INTERACT',
	' ': 'DODGE',
	f: 'ATTACK',
	g: 'HEAVY_ATTACK',
	i: 'INVENTORY',
	c: 'CRAFTING',
	b: 'BUILD',
	r: 'ROTATE',
	j: 'QUESTS',
	m: 'MAP',
	escape: 'PAUSE',
	1: 'HOTBAR_1',
	2: 'HOTBAR_2',
	3: 'HOTBAR_3',
	4: 'HOTBAR_4',
	5: 'HOTBAR_5'
};

/** Canonical ordering for the HUD hotbar. */
export const HOTBAR_ACTIONS: InputAction[] = [
	'HOTBAR_1',
	'HOTBAR_2',
	'HOTBAR_3',
	'HOTBAR_4',
	'HOTBAR_5'
];

/**
 * Engine-agnostic contract the Phaser input system fulfils.
 * Kept separate so the game core never imports Phaser.
 */
export interface InputState {
	/** Normalised movement vector (magnitude <= 1). */
	moveVector(): Vec2;
	/** World-space aim direction (unit vector) from the pointer. */
	aimVector(): Vec2;
	isDown(action: InputAction): boolean;
	justPressed(action: InputAction): boolean;
	/** Consume the once-per-press flag for an action. */
	consume(action: InputAction): void;
}
