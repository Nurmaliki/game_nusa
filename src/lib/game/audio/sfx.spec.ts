import { describe, it, expect } from 'vitest';
import { SFX, SFX_IDS, getSfx, type SfxDefinition } from './sfx';

describe('SFX catalogue', () => {
	it('every definition is internally consistent', () => {
		for (const id of SFX_IDS) {
			const def: SfxDefinition = SFX[id];
			expect(def.id, id).toBe(id);
			// Gains must be audible but never clipping.
			expect(def.gain).toBeGreaterThan(0);
			expect(def.gain).toBeLessThanOrEqual(1);
			// Durations are positive and short enough for a one-shot.
			expect(def.duration).toBeGreaterThan(0);
			expect(def.duration).toBeLessThanOrEqual(2);
			expect(def.attack).toBeGreaterThanOrEqual(0);
			expect(def.attack).toBeLessThan(def.duration);
			// Oscillator patches need a positive start frequency.
			if (def.wave !== 'noise') {
				expect(def.startHz).toBeGreaterThan(0);
				expect(def.endHz).toBeGreaterThan(0);
			}
		}
	});

	it('exposes an id-keyed lookup', () => {
		expect(getSfx('ui_click')?.id).toBe('ui_click');
		expect(getSfx('does_not_exist')).toBeUndefined();
	});

	it('ships the gameplay cue set', () => {
		for (const id of [
			'ui_click',
			'attack_light',
			'attack_heavy',
			'hit',
			'crit',
			'hurt',
			'death',
			'harvest',
			'craft',
			'build',
			'quest_advance',
			'chapter_complete',
			'level_up',
			'weather_rain',
			'weather_thunder',
			'fish_catch',
			'achievement'
		]) {
			expect(SFX[id], `missing sfx "${id}"`).toBeDefined();
		}
	});
});
