import type { InputAction } from './actions';
import type { Vec2 } from '$types/core';

/**
 * Controls bridge (§32 / §44).
 *
 * Decouples the Svelte touch UI from the Phaser input implementation. The world
 * scene registers the live control handle when it boots; the on-screen joystick
 * and action buttons push into it. No Phaser import here so the UI and core
 * stay engine-agnostic.
 */
export interface ControlHandle {
	/** Feed a normalised movement vector from a virtual joystick. */
	setMove(v: Vec2): void;
	/** Synthesise a press for a discrete action button. */
	press(action: InputAction): void;
	/** Hold/release an action (for sprint toggles). */
	setHeld(action: InputAction, held: boolean): void;
}

let handle: ControlHandle | null = null;

export function registerControls(next: ControlHandle): void {
	handle = next;
}

export function clearControls(): void {
	handle = null;
}

export function hasControls(): boolean {
	return handle !== null;
}

export function setVirtualMove(v: Vec2): void {
	handle?.setMove(v);
}

export function virtualPress(action: InputAction): void {
	handle?.press(action);
}

export function setVirtualHeld(action: InputAction, held: boolean): void {
	handle?.setHeld(action, held);
}
