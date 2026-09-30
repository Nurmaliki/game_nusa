import Phaser from 'phaser';

/**
 * Programmatic placeholder textures (see §35 / §66).
 *
 * These are ORIGINAL, generated at runtime and clearly temporary. They exist so
 * the game is fully playable and testable before final pixel art is produced.
 * Swapping in real assets later only requires replacing the texture keys.
 */

export interface PlaceholderSpec {
	key: string;
	color: number;
	/** Optional accent color for a border / detail. */
	accent?: number;
	size?: number;
	shape?: 'square' | 'circle' | 'diamond';
}

const PLAYER_TEX = 'placeholder_player';
const TREE_TEX = 'placeholder_tree';
const ROCK_TEX = 'placeholder_rock';
const BUSH_TEX = 'placeholder_bush';
const TILE_TEX = 'placeholder_tile';
const CREATURE_TEX = 'placeholder_creature';
const PREDATOR_TEX = 'placeholder_predator';

export const PLACEHOLDER_KEYS = {
	player: PLAYER_TEX,
	tree: TREE_TEX,
	rock: ROCK_TEX,
	bush: BUSH_TEX,
	tile: TILE_TEX,
	creature: CREATURE_TEX,
	predator: PREDATOR_TEX
} as const;

function makeSquare(
	scene: Phaser.Scene,
	key: string,
	size: number,
	color: number,
	accent?: number
): void {
	if (scene.textures.exists(key)) return;
	const g = scene.make.graphics({ x: 0, y: 0 }, false);
	g.fillStyle(color, 1);
	g.fillRect(0, 0, size, size);
	if (accent !== undefined) {
		g.lineStyle(2, accent, 1);
		g.strokeRect(1, 1, size - 2, size - 2);
	}
	g.generateTexture(key, size, size);
	g.destroy();
}

function makeCircle(
	scene: Phaser.Scene,
	key: string,
	size: number,
	color: number,
	accent?: number
): void {
	if (scene.textures.exists(key)) return;
	const g = scene.make.graphics({ x: 0, y: 0 }, false);
	g.fillStyle(color, 1);
	g.fillCircle(size / 2, size / 2, size / 2 - 1);
	if (accent !== undefined) {
		g.lineStyle(2, accent, 1);
		g.strokeCircle(size / 2, size / 2, size / 2 - 2);
	}
	g.generateTexture(key, size, size);
	g.destroy();
}

function makeDiamond(
	scene: Phaser.Scene,
	key: string,
	size: number,
	color: number,
	accent?: number
): void {
	if (scene.textures.exists(key)) return;
	const g = scene.make.graphics({ x: 0, y: 0 }, false);
	const points = [
		new Phaser.Math.Vector2(size / 2, 0),
		new Phaser.Math.Vector2(size, size / 2),
		new Phaser.Math.Vector2(size / 2, size),
		new Phaser.Math.Vector2(0, size / 2)
	];
	g.fillStyle(color, 1);
	g.fillPoints(points, true);
	if (accent !== undefined) {
		g.lineStyle(2, accent, 1);
		g.strokePoints(points, true);
	}
	g.generateTexture(key, size, size);
	g.destroy();
}

/** Create every placeholder texture the game currently needs. Idempotent. */
export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
	makeCircle(scene, PLAYER_TEX, 28, 0x38a169, 0x22543d); // player = green circle
	makeSquare(scene, TREE_TEX, 40, 0x2f855a, 0x1c4532); // tree = dark green square
	makeCircle(scene, ROCK_TEX, 32, 0x718096, 0x2d3748); // rock = grey circle
	makeCircle(scene, BUSH_TEX, 26, 0x68d391, 0x2f855a); // bush = light green
	makeSquare(scene, TILE_TEX, 32, 0x1a202c, 0x2d3748); // neutral tile
	makeCircle(scene, CREATURE_TEX, 24, 0xb7791f, 0x744210); // creature = amber circle
	makeDiamond(scene, PREDATOR_TEX, 30, 0xc53030, 0x742a2a); // predator = red diamond
}

/** Build an arbitrary placeholder at runtime (used by item icons). */
export function makePlaceholder(scene: Phaser.Scene, spec: PlaceholderSpec): void {
	const size = spec.size ?? 24;
	if (spec.shape === 'circle') makeCircle(scene, spec.key, size, spec.color, spec.accent);
	else if (spec.shape === 'diamond') {
		if (scene.textures.exists(spec.key)) return;
		const g = scene.make.graphics({ x: 0, y: 0 }, false);
		g.fillStyle(spec.color, 1);
		g.fillPoints(
			[
				new Phaser.Math.Vector2(size / 2, 0),
				new Phaser.Math.Vector2(size, size / 2),
				new Phaser.Math.Vector2(size / 2, size),
				new Phaser.Math.Vector2(0, size / 2)
			],
			true
		);
		g.generateTexture(spec.key, size, size);
		g.destroy();
	} else makeSquare(scene, spec.key, size, spec.color, spec.accent);
}

/**
 * Colour used for a given item/rarity tint. Pure function, no engine deps so it
 * is unit-testable and reused by Svelte icon renderers.
 */
export function rarityColor(rarity: string): number {
	switch (rarity) {
		case 'uncommon':
			return 0x38a169;
		case 'rare':
			return 0x3182ce;
		case 'special':
			return 0x805ad5;
		case 'quest':
			return 0xd69e2e;
		default:
			return 0xa0aec0;
	}
}
