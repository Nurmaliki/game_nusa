/**
 * Procedural sound-effect catalogue (see §24 / §45).
 *
 * Every sound is generated at runtime from oscillators / noise — NO audio files
 * are shipped (original, offline-safe, zero third-party assets). Each entry is
 * pure data describing a synth patch so the definitions are unit-testable and
 * the engine stays engine-agnostic.
 */

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

export interface SfxDefinition {
	id: string;
	/** Oscillator shape (or noise). */
	wave: Waveform;
	/** Start frequency in Hz (ignored for noise). */
	startHz: number;
	/** End frequency in Hz; if different, a linear glide is applied. */
	endHz: number;
	/** Attack time in seconds. */
	attack: number;
	/** Decay/ sustain tail in seconds (total duration). */
	duration: number;
	/** Peak gain in [0,1] before the master/sfx bus is applied. */
	gain: number;
	/** Optional lowpass cutoff in Hz (darkens the sound). */
	lowpassHz?: number;
}

export const SFX: Record<string, SfxDefinition> = {
	ui_click: {
		id: 'ui_click',
		wave: 'square',
		startHz: 660,
		endHz: 880,
		attack: 0.005,
		duration: 0.08,
		gain: 0.18
	},
	ui_confirm: {
		id: 'ui_confirm',
		wave: 'triangle',
		startHz: 520,
		endHz: 900,
		attack: 0.01,
		duration: 0.18,
		gain: 0.22
	},
	ui_error: {
		id: 'ui_error',
		wave: 'square',
		startHz: 240,
		endHz: 120,
		attack: 0.005,
		duration: 0.22,
		gain: 0.2,
		lowpassHz: 900
	},
	harvest: {
		id: 'harvest',
		wave: 'triangle',
		startHz: 320,
		endHz: 180,
		attack: 0.005,
		duration: 0.12,
		gain: 0.2
	},
	craft: {
		id: 'craft',
		wave: 'sawtooth',
		startHz: 300,
		endHz: 620,
		attack: 0.01,
		duration: 0.26,
		gain: 0.18,
		lowpassHz: 2400
	},
	build: {
		id: 'build',
		wave: 'square',
		startHz: 160,
		endHz: 90,
		attack: 0.005,
		duration: 0.2,
		gain: 0.24,
		lowpassHz: 1200
	},
	attack_light: {
		id: 'attack_light',
		wave: 'noise',
		startHz: 0,
		endHz: 0,
		attack: 0.001,
		duration: 0.09,
		gain: 0.16,
		lowpassHz: 3200
	},
	attack_heavy: {
		id: 'attack_heavy',
		wave: 'noise',
		startHz: 0,
		endHz: 0,
		attack: 0.001,
		duration: 0.2,
		gain: 0.26,
		lowpassHz: 1400
	},
	hit: {
		id: 'hit',
		wave: 'square',
		startHz: 200,
		endHz: 90,
		attack: 0.001,
		duration: 0.1,
		gain: 0.24,
		lowpassHz: 1800
	},
	crit: {
		id: 'crit',
		wave: 'sawtooth',
		startHz: 480,
		endHz: 220,
		attack: 0.001,
		duration: 0.16,
		gain: 0.28,
		lowpassHz: 3000
	},
	hurt: {
		id: 'hurt',
		wave: 'sawtooth',
		startHz: 300,
		endHz: 140,
		attack: 0.002,
		duration: 0.24,
		gain: 0.26,
		lowpassHz: 1600
	},
	death: {
		id: 'death',
		wave: 'sine',
		startHz: 320,
		endHz: 60,
		attack: 0.01,
		duration: 0.9,
		gain: 0.3,
		lowpassHz: 1200
	},
	quest_advance: {
		id: 'quest_advance',
		wave: 'triangle',
		startHz: 520,
		endHz: 780,
		attack: 0.01,
		duration: 0.3,
		gain: 0.24
	},
	chapter_complete: {
		id: 'chapter_complete',
		wave: 'triangle',
		startHz: 440,
		endHz: 1320,
		attack: 0.02,
		duration: 1.2,
		gain: 0.3
	},
	toast: {
		id: 'toast',
		wave: 'sine',
		startHz: 700,
		endHz: 900,
		attack: 0.005,
		duration: 0.12,
		gain: 0.16
	},
	footstep: {
		id: 'footstep',
		wave: 'noise',
		startHz: 0,
		endHz: 0,
		attack: 0.001,
		duration: 0.06,
		gain: 0.08,
		lowpassHz: 700
	}
};

export const SFX_IDS = Object.keys(SFX);

export function getSfx(id: string): SfxDefinition | undefined {
	return SFX[id];
}
