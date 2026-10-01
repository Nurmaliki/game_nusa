import Phaser from 'phaser';
import { paint } from './art';
import { SPRITE_KEYS, ensureSprites, resourceTexture, creatureTexture } from './sprites';

/**
 * Programmatic placeholder textures (see §35 / §66).
 *
 * These are ORIGINAL, generated at runtime and clearly temporary. They exist so
 * the game is fully playable and testable before final pixel art is produced.
 * Swapping in real assets later only requires replacing the texture keys.
 *
 * The actual pixel art lives in `sprites.ts`; this module keeps the stable
 * public API (texture-key registry + idempotent ensure fn) that scenes and
 * entities depend on.
 */

export interface PlaceholderSpec {
	key: string;
	color: number;
	/** Optional accent color for a border / detail. */
	accent?: number;
	size?: number;
	shape?: 'square' | 'circle' | 'diamond';
}

/**
 * Stable texture keys. Kept for backwards compatibility with entity/ data
 * definitions; each now resolves to a recognizable sprite rather than a flat
 * primitive.
 */
export const PLACEHOLDER_KEYS = {
	player: SPRITE_KEYS.player,
	tree: SPRITE_KEYS.tree,
	rock: SPRITE_KEYS.rock,
	bush: SPRITE_KEYS.bush,
	tile: 'placeholder_tile',
	creature: SPRITE_KEYS.monkey,
	predator: SPRITE_KEYS.wolf
} as const;

/** Backwards-compatible aliases some data files still reference by string. */
const LEGACY_ALIASES: Record<string, string> = {
	placeholder_player: SPRITE_KEYS.player,
	placeholder_tree: SPRITE_KEYS.tree,
	placeholder_rock: SPRITE_KEYS.rock,
	placeholder_bush: SPRITE_KEYS.bush,
	placeholder_creature: SPRITE_KEYS.monkey,
	placeholder_predator: SPRITE_KEYS.wolf,
	placeholder_tile: SPRITE_KEYS.tileGrass
};

function tileTexture(scene: Phaser.Scene, key: string, color: number, accent: number): void {
	paint(scene, key, 32, 32, (g) => {
		g.fillStyle(color, 1);
		g.fillRect(0, 0, 32, 32);
		g.fillStyle(accent, 1);
		g.fillRect(0, 0, 32, 2);
		g.fillRect(0, 30, 32, 2);
		g.fillRect(0, 0, 2, 32);
		g.fillRect(30, 0, 2, 32);
	});
}

/** Create every placeholder texture the game currently needs. Idempotent. */
export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
	ensureSprites(scene);
	// A neutral tile texture kept for any data referencing `placeholder_tile`.
	tileTexture(scene, 'placeholder_tile', 0x2d3748, 0x4a5568);
}

/**
 * Resolve an abstract texture key (possibly a legacy `placeholder_*` string from
 * a data definition) to a real, drawn sprite texture key. Falls back to the
 * generic bush sprite when nothing matches, so rendering never crashes.
 */
export function resolveTexture(scene: Phaser.Scene, key: string): string {
	if (scene.textures.exists(key)) return key;
	const alias = LEGACY_ALIASES[key];
	if (alias && scene.textures.exists(alias)) return alias;
	return SPRITE_KEYS.bush;
}

export { resourceTexture, creatureTexture };

/** Build an arbitrary placeholder at runtime (used by item icons). */
export function makePlaceholder(scene: Phaser.Scene, spec: PlaceholderSpec): void {
	const size = spec.size ?? 24;
	if (scene.textures.exists(spec.key)) return;
	paint(scene, spec.key, size, size, (g) => {
		if (spec.shape === 'circle') {
			g.fillStyle(spec.color, 1);
			g.fillCircle(size / 2, size / 2, size / 2 - 1);
			if (spec.accent !== undefined) {
				g.lineStyle(2, spec.accent, 1);
				g.strokeCircle(size / 2, size / 2, size / 2 - 2);
			}
		} else if (spec.shape === 'diamond') {
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
		} else {
			g.fillStyle(spec.color, 1);
			g.fillRect(0, 0, size, size);
			if (spec.accent !== undefined) {
				g.lineStyle(2, spec.accent, 1);
				g.strokeRect(1, 1, size - 2, size - 2);
			}
		}
	});
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
