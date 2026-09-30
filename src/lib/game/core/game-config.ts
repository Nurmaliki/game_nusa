import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { WorldScene } from '../scenes/WorldScene';
import type { GameEventBus } from './event-bus';

export interface GameBootOptions {
	parent: HTMLElement;
	bus: GameEventBus;
}

/**
 * Creates the Phaser.Game instance. Phaser must only ever be constructed in the
 * browser (see §3/§5 SSR guard is handled by the caller).
 */
export function createGame({ parent, bus }: GameBootOptions): Phaser.Game {
	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.AUTO,
		parent,
		backgroundColor: '#0b1220',
		scale: {
			mode: Phaser.Scale.RESIZE,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: '100%',
			height: '100%'
		},
		pixelArt: true,
		roundPixels: true,
		render: {
			antialias: false,
			powerPreference: 'high-performance'
		},
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 0 },
				debug: false
			}
		},
		scene: [BootScene, WorldScene]
	};

	const game = new Phaser.Game(config);
	// Expose the bus to scenes via the registry without importing it directly.
	game.registry.set('bus', bus);
	return game;
}
