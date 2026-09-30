import { GameState } from '$game/core/game-state';
import {
	exportSave as serializeExport,
	inspectSlot,
	listSaves,
	loadSaveWithRecovery,
	parseImportedSave,
	restoreLatestBackup,
	writeSave
} from '$game/save/repository';
import { getGameBus } from '$game/core/event-bus';
import { log } from '$game/core/logger';
import { startAutosave } from '$game/save/autosave';
import type { GameSave, SaveSlotMeta } from '$types/save';
import type { StatsSnapshot } from '$types/events';

/**
 * Session layer connecting the pure GameState to the UI/engine.
 * Holds the active save slot and mediates persistence. Single instance.
 */
class GameSession {
	state: GameState | null = null;
	private autosave: { stop: () => void } | null = null;
	lastSaveAt = 0;

	hasActive(): boolean {
		return this.state !== null;
	}

	/** Begin a brand-new game in a fresh slot. */
	newGame(seed = Date.now() >>> 0): GameState {
		const saveId = `save_${Date.now().toString(36)}`;
		const state = new GameState(saveId, seed, Date.now());
		state.seedNewGame();
		state.refreshQuests();
		this.state = state;
		this.beginAutosave();
		this.emitStats();
		log.info('GAME', `New game started (slot ${saveId}, seed ${seed})`);
		return state;
	}

	/** Load a save (already validated/migrated) into the session. */
	load(save: GameSave): GameState {
		const state = GameState.fromSave(save);
		state.refreshQuests();
		this.state = state;
		this.beginAutosave();
		this.emitStats();
		log.info('SAVE', `Loaded save ${save.saveId}`);
		return state;
	}

	async saveNow(): Promise<{ ok: boolean; error?: string }> {
		if (!this.state) return { ok: false, error: 'no_active_game' };
		const save = this.state.toSave();
		const result = await writeSave(save);
		if (result.ok) {
			this.lastSaveAt = Date.now();
			getGameBus().emit('SAVE_COMPLETED', undefined);
			log.info('SAVE', 'Autosave/manual save completed');
		} else {
			log.error('SAVE', `Save failed: ${result.error}`);
			getGameBus().emit('GAME_ERROR', {
				category: 'SAVE',
				message: mapSaveError(result.error),
				recoverable: true
			});
		}
		return result;
	}

	async listSlots(): Promise<SaveSlotMeta[]> {
		return listSaves();
	}

	/** Load a slot from storage with corruption recovery (backup fallback). */
	async loadSlot(
		saveId: string
	): Promise<{ ok: boolean; source?: 'primary' | 'backup'; error?: string }> {
		const result = await loadSaveWithRecovery(saveId);
		if (!result.ok || !result.save) {
			log.error('SAVE', `loadSlot failed: ${result.error}`);
			return { ok: false, error: result.error };
		}
		this.load(result.save);
		if (result.source === 'backup') {
			getGameBus().emit('TOAST', {
				text: 'Save rusak — dipulihkan dari cadangan.',
				kind: 'warning'
			});
		}
		if (result.repairs && result.repairs.length > 0) {
			log.info('SAVE', `recovered with ${result.repairs.length} repair(s)`);
		}
		return { ok: true, source: result.source };
	}

	async inspect(saveId: string) {
		return inspectSlot(saveId);
	}

	async restoreBackup(saveId: string): Promise<GameSave | null> {
		return restoreLatestBackup(saveId);
	}

	importFromText(text: string): { ok: boolean; error?: string; repairs?: string[] } {
		const parsed = parseImportedSave(text);
		if (!parsed.ok || !parsed.save) return { ok: false, error: parsed.error };
		// Persist the imported save, then load it.
		void writeSave(parsed.save);
		this.load(parsed.save);
		if (parsed.repairs && parsed.repairs.length > 0) {
			getGameBus().emit('TOAST', {
				text: `Impor dengan perbaikan (${parsed.repairs.length}).`,
				kind: 'warning'
			});
		}
		return { ok: true, repairs: parsed.repairs };
	}

	exportCurrent(): string | null {
		if (!this.state) return null;
		return serializeExport(this.state.toSave(), Date.now());
	}

	/** Push the current stats to the UI. */
	emitStats(): void {
		if (!this.state) return;
		const s = this.state.stats;
		const snapshot: StatsSnapshot = {
			health: s.health,
			hunger: s.hunger,
			thirst: s.thirst,
			energy: s.energy
		};
		getGameBus().emit('PLAYER_STATS_CHANGED', {
			...snapshot,
			maxHealth: this.state.caps.maxHealth,
			maxHunger: this.state.caps.maxHunger,
			maxThirst: this.state.caps.maxThirst,
			maxEnergy: this.state.caps.maxEnergy
		});
	}

	notifyInventory(): void {
		if (!this.state) return;
		this.state.refreshQuests();
		getGameBus().emit('INVENTORY_CHANGED', { revision: this.state.inventory.revision });
		getGameBus().emit('QUEST_UPDATED_UI', { revision: Date.now() });
	}

	private beginAutosave(): void {
		this.autosave?.stop();
		this.autosave = startAutosave(() => void this.saveNow());
	}

	stop(): void {
		this.autosave?.stop();
		this.autosave = null;
	}
}

function mapSaveError(code?: string): string {
	switch (code) {
		case 'quota_exceeded':
			return 'Penyimpanan penuh. Hapus save lama lalu coba lagi.';
		case 'storage_unavailable':
			return 'Penyimpanan tidak tersedia di browser ini. Progres tidak dapat disimpan.';
		default:
			return 'Gagal menyimpan. Coba lagi.';
	}
}

let session: GameSession | null = null;

export function getGameSession(): GameSession {
	if (!session) session = new GameSession();
	return session;
}

export type { GameSession };
