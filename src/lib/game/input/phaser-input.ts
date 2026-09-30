import Phaser from 'phaser';
import { ACTION_BINDINGS, type InputAction, type InputState } from './actions';
import type { Vec2 } from '$types/core';

/**
 * Phaser-backed input implementation of {@link InputState}.
 * Translates physical keys into abstract actions and exposes a normalised
 * movement vector. Mobile virtual controls feed into the same action map.
 */
export class PhaserInput implements InputState {
	private scene: Phaser.Scene;
	private downSet = new Set<InputAction>();
	private pressedFrame = new Set<InputAction>();
	private lastPointer: { x: number; y: number } = { x: 0, y: 0 };

	/** Externally-driven vector from the mobile joystick (unit range). */
	private virtualMove: Vec2 = { x: 0, y: 0 };

	private keyDownHandler = (event: KeyboardEvent) => this.onKey(event, true);
	private keyUpHandler = (event: KeyboardEvent) => this.onKey(event, false);
	private pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
		this.lastPointer = { x: pointer.worldX, y: pointer.worldY };
	};
	private pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
		this.lastPointer = { x: pointer.worldX, y: pointer.worldY };
		if (pointer.leftButtonDown()) {
			if (!this.downSet.has('ATTACK')) this.pressedFrame.add('ATTACK');
			this.downSet.add('ATTACK');
		}
	};
	private pointerUpHandler = () => {
		this.downSet.delete('ATTACK');
	};

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		scene.input.keyboard?.on('keydown', this.keyDownHandler);
		scene.input.keyboard?.on('keyup', this.keyUpHandler);
		scene.input.on('pointermove', this.pointerMoveHandler);
		scene.input.on('pointerdown', this.pointerDownHandler);
		scene.input.on('pointerup', this.pointerUpHandler);
	}

	private onKey(event: KeyboardEvent, isDown: boolean): void {
		const action = ACTION_BINDINGS[event.key.toLowerCase()];
		if (!action) return;
		if (isDown) {
			if (!this.downSet.has(action)) this.pressedFrame.add(action);
			this.downSet.add(action);
		} else {
			this.downSet.delete(action);
		}
		// Prevent page scroll / focus jumps caused by game keys.
		if (
			['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(
				event.key.toLowerCase()
			)
		) {
			event.preventDefault();
		}
	}

	/** Begin a fresh frame: clear once-per-press flags from the previous frame. */
	beginFrame(): void {
		// pressedFrame is cleared at END of frame; keep between begin/end.
	}

	/** Called at the end of each update to clear transient press flags. */
	endFrame(): void {
		this.pressedFrame.clear();
	}

	/** Injected by mobile controls. */
	setVirtualMove(v: Vec2): void {
		this.virtualMove = v;
	}

	/** Synth a press from a UI/mobile button. */
	synthPress(action: InputAction): void {
		this.pressedFrame.add(action);
		this.downSet.add(action);
		setTimeout(() => this.downSet.delete(action), 60);
	}

	/** Hold or release an action from a UI/mobile control (e.g. sprint). */
	synthHold(action: InputAction, held: boolean): void {
		if (held) {
			if (!this.downSet.has(action)) this.pressedFrame.add(action);
			this.downSet.add(action);
		} else {
			this.downSet.delete(action);
		}
	}

	moveVector(): Vec2 {
		let x = 0;
		let y = 0;
		if (this.isDown('MOVE_LEFT')) x -= 1;
		if (this.isDown('MOVE_RIGHT')) x += 1;
		if (this.isDown('MOVE_UP')) y -= 1;
		if (this.isDown('MOVE_DOWN')) y += 1;

		// Mobile joystick overrides keyboard when active.
		if (Math.abs(this.virtualMove.x) > 0.01 || Math.abs(this.virtualMove.y) > 0.01) {
			x = this.virtualMove.x;
			y = this.virtualMove.y;
		}

		const len = Math.hypot(x, y);
		if (len > 1) {
			x /= len;
			y /= len;
		}
		return { x, y };
	}

	aimVector(): Vec2 {
		const player = this.scene.cameras.main;
		const px = this.lastPointer.x - (player.scrollX + player.width / 2);
		const py = this.lastPointer.y - (player.scrollY + player.height / 2);
		const len = Math.hypot(px, py);
		if (len < 0.0001) return { x: 1, y: 0 };
		return { x: px / len, y: py / len };
	}

	isDown(action: InputAction): boolean {
		return this.downSet.has(action);
	}

	justPressed(action: InputAction): boolean {
		return this.pressedFrame.has(action);
	}

	consume(action: InputAction): void {
		this.pressedFrame.delete(action);
	}

	destroy(): void {
		this.scene.input.keyboard?.off('keydown', this.keyDownHandler);
		this.scene.input.keyboard?.off('keyup', this.keyUpHandler);
		this.scene.input.off('pointermove', this.pointerMoveHandler);
		this.scene.input.off('pointerdown', this.pointerDownHandler);
		this.scene.input.off('pointerup', this.pointerUpHandler);
		this.downSet.clear();
		this.pressedFrame.clear();
	}
}
