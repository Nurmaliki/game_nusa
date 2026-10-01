import type { GameEventName } from '$types/events';

/**
 * Declarative mapping from game events to procedural SFX (see §45).
 *
 * Kept as pure data (event name -> sfx id) so it can be unit-tested and tweaked
 * without touching the audio engine. Events with dynamic payloads (e.g. combat
 * crit vs. normal hit) are resolved by {@link resolveSfx} instead.
 */
export const EVENT_SFX: Partial<Record<GameEventName, string>> = {
	PLAYER_DAMAGED: 'hurt',
	PLAYER_DIED: 'death',
	BUILD_PLACED: 'build',
	CHAPTER_COMPLETE: 'chapter_complete',
	QUEST_UPDATED_UI: 'quest_advance',
	SAVE_COMPLETED: 'ui_confirm',
	SKILL_LEVEL_UP: 'level_up'
};

/** Events whose sound depends on the payload. */
export interface CombatHitPayload {
	damage: number;
	isCritical: boolean;
}

/**
 * Resolve the SFX id for a combat hit (crit vs. normal).
 * Pure so it can be asserted in tests.
 */
export function sfxForCombatHit(payload: CombatHitPayload): string {
	return payload.isCritical ? 'crit' : 'hit';
}

/** Resolve the SFX id for a toast by kind. */
export function sfxForToast(kind: 'info' | 'success' | 'warning'): string {
	switch (kind) {
		case 'warning':
			return 'ui_error';
		case 'success':
			return 'ui_confirm';
		default:
			return 'toast';
	}
}
