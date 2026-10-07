import Phaser from 'phaser';
import { PLACEHOLDER_KEYS } from '../core/placeholders';
import { clampMagnitude, normalize, resolveMoveVelocity } from '../core/movement';
import { BALANCE } from '../config/balance';
import type { InputState } from '../input/actions';
import type { Vec2 } from '$types/core';

/**
 * The player avatar. Owns only presentation + physics here; survival stats and
 * gameplay rules live in the pure game-core systems (Phase 2+).
 */
export class Player {
	readonly sprite: Phaser.Physics.Arcade.Sprite;
	private scene: Phaser.Scene;
	private facing: Vec2 = { x: 1, y: 0 };
	private dodgeUntil = 0;
	private dodgeCooldownUntil = 0;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		this.scene = scene;
		this.sprite = scene.physics.add.sprite(x, y, PLACEHOLDER_KEYS.player);
		this.sprite.setOrigin(0.5, 0.85);
		this.sprite.setDepth(10);
		const body = this.sprite.body as Phaser.Physics.Arcade.Body;
		// Feet-centred body so Y-sorting pivots on the ground contact point. The
		// hitbox stays a small circle at the feet regardless of the taller art.
		body.setCircle(
			BALANCE.player.bodyRadius,
			this.sprite.width * 0.5 - BALANCE.player.bodyRadius,
			this.sprite.height * 0.85 - BALANCE.player.bodyRadius
		);
		body.setCollideWorldBounds(true);
	}

	get position(): Vec2 {
		return { x: this.sprite.x, y: this.sprite.y };
	}

	get facingVector(): Vec2 {
		return this.facing;
	}

	/**
	 * Update movement for this frame.
	 * @param energy current energy (sprint requires energy > 0)
	 */
	update(input: InputState, energy: number, now: number): void {
		const move = input.moveVector();
		const sprinting = input.isDown('SPRINT') && energy > 0;

		// Dodge: short burst in facing/move direction, gated by cooldown.
		if (input.justPressed('DODGE') && now >= this.dodgeCooldownUntil) {
			input.consume('DODGE');
			this.dodgeUntil = now + BALANCE.player.dodgeDurationMs;
			this.dodgeCooldownUntil = now + BALANCE.player.dodgeCooldownMs;
		}

		const body = this.sprite.body as Phaser.Physics.Arcade.Body;

		if (now < this.dodgeUntil) {
			const dir = normalize(move.x !== 0 || move.y !== 0 ? move : this.facing);
			body.setVelocity(dir.x * BALANCE.player.dodgeSpeed, dir.y * BALANCE.player.dodgeSpeed);
		} else {
			const v = resolveMoveVelocity(
				move,
				sprinting,
				sprinting,
				BALANCE.player.walkSpeed,
				BALANCE.player.sprintSpeed
			);
			body.setVelocity(v.x, v.y);
		}

		// Track facing. Moving always faces the direction of travel (so WASD/joystick
		// drives the sprite and it never moonwalks); when standing still a pointer
		// aim takes over so the character can look around / aim.
		const aim = clampMagnitude(input.aimVector(), 1);
		if (move.x !== 0 || move.y !== 0) {
			this.facing = normalize(move);
		} else if (aim.x !== 0 || aim.y !== 0) {
			this.facing = normalize(aim);
		}
	}

	isSprinting(input: InputState): boolean {
		return input.isDown('SPRINT') && (this.sprite.body as Phaser.Physics.Arcade.Body).speed > 1;
	}

	destroy(): void {
		this.sprite.destroy();
	}
}
