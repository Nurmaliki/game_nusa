import Phaser from 'phaser';
import { ensurePlaceholderTextures } from '../core/placeholders';
import { log } from '../core/logger';

/**
 * BootScene prepares generated placeholder textures and then hands off to the
 * world. In later phases this is where real asset manifests are loaded.
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super('Boot');
	}

	preload(): void {
		// Loading bar placeholder (real asset loading arrives in later phases).
		const { width, height } = this.scale;
		const bar = this.add.rectangle(width / 2, height / 2, 240, 12, 0x2d3748);
		const fill = this.add.rectangle(width / 2 - 120, height / 2, 0, 12, 0x38a169).setOrigin(0, 0.5);

		this.load.on('progress', (p: number) => {
			fill.width = 240 * p;
		});
		this.load.on('complete', () => {
			bar.destroy();
			fill.destroy();
		});
	}

	create(): void {
		ensurePlaceholderTextures(this);
		log.info('GAME', 'Boot complete, starting world scene');
		this.scene.start('World');
	}
}
