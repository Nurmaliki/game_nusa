import { describe, it, expect } from 'vitest';
import { EVENT_SFX, sfxForCombatHit, sfxForToast } from './audio-map';
import { SFX } from './sfx';

describe('audio event map', () => {
	it('maps every referenced event to an existing sfx id', () => {
		for (const [event, sfxId] of Object.entries(EVENT_SFX)) {
			expect(sfxId, event).toBeTruthy();
			expect(SFX[sfxId as string], `${event} -> ${sfxId}`).toBeDefined();
		}
	});

	it('covers the key feedback events', () => {
		expect(EVENT_SFX.PLAYER_DAMAGED).toBe('hurt');
		expect(EVENT_SFX.PLAYER_DIED).toBe('death');
		expect(EVENT_SFX.BUILD_PLACED).toBe('build');
		expect(EVENT_SFX.CHAPTER_COMPLETE).toBe('chapter_complete');
		expect(EVENT_SFX.SKILL_LEVEL_UP).toBe('level_up');
	});

	it('resolves combat hits to crit or hit', () => {
		expect(sfxForCombatHit({ damage: 10, isCritical: false })).toBe('hit');
		expect(sfxForCombatHit({ damage: 10, isCritical: true })).toBe('crit');
	});

	it('resolves toast kinds to distinct cues', () => {
		expect(sfxForToast('warning')).toBe('ui_error');
		expect(sfxForToast('success')).toBe('ui_confirm');
		expect(sfxForToast('info')).toBe('toast');
	});
});
