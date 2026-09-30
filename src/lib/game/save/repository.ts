import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { GameSave, SaveSlotMeta } from '$types/save';
import { log } from '../core/logger';
import { buildSlotMeta, migrateSave, repairSave, validateSave } from './migration';
import { serializeExport, unwrapSave } from './integrity';
import { BALANCE } from '../config/balance';

/**
 * IndexedDB persistence layer (see §26–§28).
 *
 * Object stores:
 *   saves   — saveId -> GameSave (current snapshots)
 *   backups — saveId -> GameSave[] (previous snapshots, newest first)
 *   meta    — saveId -> SaveSlotMeta (menu summaries)
 *
 * Atomic write strategy: write → verify → promote; the previous snapshot is
 * retained as a backup. Writes never happen per-frame.
 */
interface NusantaraDB extends DBSchema {
	saves: { key: string; value: GameSave };
	backups: { key: string; value: GameSave[] };
	meta: { key: string; value: SaveSlotMeta };
}

const DB_NAME = 'nusantara';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NusantaraDB>> | null = null;

function getDB(): Promise<IDBPDatabase<NusantaraDB>> {
	if (!dbPromise) {
		dbPromise = openDB<NusantaraDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
				if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups');
				if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
			}
		});
	}
	return dbPromise;
}

/** True if IndexedDB is available in this environment. */
export function isStorageAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}

export async function listSaves(): Promise<SaveSlotMeta[]> {
	if (!isStorageAvailable()) return [];
	const db = await getDB();
	const metas = await db.getAll('meta');
	return metas.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSave(saveId: string): Promise<GameSave | null> {
	const db = await getDB();
	return (await db.get('saves', saveId)) ?? null;
}

export interface LoadResult {
	ok: boolean;
	save?: GameSave;
	/** 'primary' when the main snapshot was fine; 'backup' when recovered. */
	source?: 'primary' | 'backup';
	/** Repairs applied during recovery, if any. */
	repairs?: string[];
	error?: string;
}

/**
 * Load a slot with corruption recovery (§44).
 * 1. Read + validate + migrate the primary snapshot.
 * 2. If that fails, try each backup newest-first, repairing if needed.
 * 3. If a backup works, promote it back to primary.
 */
export async function loadSaveWithRecovery(saveId: string): Promise<LoadResult> {
	if (!isStorageAvailable()) return { ok: false, error: 'storage_unavailable' };
	const db = await getDB();

	const primary = await db.get('saves', saveId);
	const primaryResult = tryNormalise(primary);
	if (primaryResult.ok && primaryResult.save) {
		return { ok: true, save: primaryResult.save, source: 'primary' };
	}
	if (primary) log.warn('SAVE', `primary snapshot for ${saveId} failed validation, trying backups`);

	const backups = (await db.get('backups', saveId)) ?? [];
	for (let i = 0; i < backups.length; i++) {
		const normalised = tryNormalise(backups[i]);
		if (normalised.ok && normalised.save) {
			// Promote the recovered snapshot back to primary.
			await db.put('saves', normalised.save, normalised.save.saveId);
			const remaining = backups.slice(i + 1);
			await db.put('backups', remaining, saveId);
			const recoveredMeta = buildSlotMeta(normalised.save);
			await db.put('meta', recoveredMeta, recoveredMeta.saveId);
			log.warn('SAVE', `recovered ${saveId} from backup #${i + 1}`);
			return {
				ok: true,
				save: normalised.save,
				source: 'backup',
				repairs: normalised.repairs
			};
		}
	}

	return { ok: false, error: primaryResult.error ?? 'no_valid_snapshot' };
}

/** Validate + migrate + (if needed) repair a raw stored object. */
function tryNormalise(raw: unknown): {
	ok: boolean;
	save?: GameSave;
	repairs?: string[];
	error?: string;
} {
	if (!raw || typeof raw !== 'object') return { ok: false, error: 'empty_snapshot' };
	const validation = validateSave(raw);
	if (validation.ok) {
		const migrated = migrateSave(raw as Record<string, unknown>);
		if (migrated.ok && migrated.data) return { ok: true, save: migrated.data };
		return { ok: false, error: migrated.error ?? 'migration_failed' };
	}
	// Attempt repair (unknown items, bad numbers, backfilled collections).
	const repaired = repairSave(raw as Record<string, unknown>, Date.now());
	if (repaired.ok && repaired.data) {
		return { ok: true, save: repaired.data, repairs: repaired.repairs };
	}
	return { ok: false, error: `invalid_save: ${validation.errors.join(', ')}` };
}

/**
 * Atomically persist a save. Retains the previous version as a backup.
 * Returns the freshly written save (with updated timestamps/meta).
 * On quota pressure, older backups are pruned before giving up (§44).
 */
export async function writeSave(save: GameSave): Promise<{ ok: boolean; error?: string }> {
	if (!isStorageAvailable()) return { ok: false, error: 'storage_unavailable' };
	try {
		const db = await getDB();
		const previous = await db.get('saves', save.saveId);

		// 1. Write the new snapshot.
		await db.put('saves', save, save.saveId);

		// 2. Verify it reads back.
		const written = await db.get('saves', save.saveId);
		if (!written || written.saveId !== save.saveId) {
			return { ok: false, error: 'verification_failed' };
		}

		// 3. Retain previous as a backup (newest first, capped).
		if (previous) {
			const existing = (await db.get('backups', save.saveId)) ?? [];
			const next = [previous, ...existing].slice(0, Math.max(1, BALANCE.save.backupRetention));
			await db.put('backups', next, save.saveId);
		}

		// 4. Update the menu summary.
		const meta = buildSlotMeta(save);
		await db.put('meta', meta, meta.saveId);
		return { ok: true };
	} catch (e) {
		log.error('SAVE', 'write failed', e);
		const message = e instanceof Error ? e.message : String(e);
		if (message.includes('quota') || message.includes('QuotaExceeded')) {
			// Free space by dropping derived data (backups) and meta and retry once.
			const freed = await pruneToFreeSpace();
			if (freed) {
				try {
					const db = await getDB();
					await db.put('saves', save, save.saveId);
					const retryMeta = buildSlotMeta(save);
					await db.put('meta', retryMeta, retryMeta.saveId);
					log.warn('SAVE', 'write succeeded after pruning backups');
					return { ok: true };
				} catch (e2) {
					log.error('SAVE', 'write still failed after pruning', e2);
				}
			}
			return { ok: false, error: 'quota_exceeded' };
		}
		return { ok: false, error: 'write_failed' };
	}
}

/**
 * Emergency space recovery: drop all retained backups (derived, safe to lose)
 * and re-verify. Returns true if anything was removed.
 */
async function pruneToFreeSpace(): Promise<boolean> {
	const db = await getDB();
	let removed = false;
	const keys = await db.getAllKeys('backups');
	for (const key of keys) {
		await db.delete('backups', key);
		removed = true;
	}
	return removed;
}

export async function getBackups(saveId: string): Promise<GameSave[]> {
	const db = await getDB();
	return (await db.get('backups', saveId)) ?? [];
}

/** Restore the most recent backup for a slot. Returns the backup if present. */
export async function restoreLatestBackup(saveId: string): Promise<GameSave | null> {
	const backups = await getBackups(saveId);
	if (backups.length === 0) return null;
	const restored = backups[0];
	// Promote the backup to primary; keep history.
	const remaining = backups.slice(1);
	const db = await getDB();
	await db.put('saves', restored, restored.saveId);
	await db.put('backups', remaining, saveId);
	const restoredMeta = buildSlotMeta(restored);
	await db.put('meta', restoredMeta, restoredMeta.saveId);
	return restored;
}

export async function deleteSave(saveId: string): Promise<void> {
	const db = await getDB();
	await db.delete('saves', saveId);
	await db.delete('backups', saveId);
	await db.delete('meta', saveId);
}

/**
 * Import a save from an untrusted JSON string (see §28 / §44).
 * unwrap (envelope + checksum) → validate → migrate → repair → validate.
 * The repair step only runs after an explicit failure, and progression fields
 * are never granted — so this can rescue a damaged file without cheating.
 */
export function parseImportedSave(text: string): {
	ok: boolean;
	save?: GameSave;
	error?: string;
	repairs?: string[];
} {
	const unwrapped = unwrapSave(text);
	if (!unwrapped.ok || !unwrapped.data) {
		return { ok: false, error: unwrapped.error ?? 'unrecognised_format' };
	}
	const raw = unwrapped.data;

	const validation = validateSave(raw);
	if (validation.ok) {
		const migrated = migrateSave(raw);
		if (!migrated.ok || !migrated.data) {
			return { ok: false, error: migrated.error ?? 'migration_failed' };
		}
		return { ok: true, save: migrated.data };
	}

	// Auto-repair path.
	const repaired = repairSave(raw, Date.now());
	if (repaired.ok && repaired.data) {
		return { ok: true, save: repaired.data, repairs: repaired.repairs };
	}
	return { ok: false, error: `invalid_save: ${validation.errors.join(', ')}` };
}

/** Export a save to a pretty-printed, checksummed JSON string. */
export function exportSave(save: GameSave, now: number = Date.now()): string {
	return serializeExport(save, now);
}

/** Export a save as a downloadable Blob (browser only). */
export function exportSaveBlob(save: GameSave, now: number = Date.now()): Blob {
	return new Blob([serializeExport(save, now)], { type: 'application/json' });
}

/** Compact diagnostic summary of a stored slot (menu/debug display). */
export async function inspectSlot(saveId: string): Promise<{
	hasPrimary: boolean;
	backups: number;
	valid: boolean;
	error?: string;
}> {
	if (!isStorageAvailable())
		return { hasPrimary: false, backups: 0, valid: false, error: 'no_storage' };
	const db = await getDB();
	const primary = await db.get('saves', saveId);
	const backups = (await db.get('backups', saveId)) ?? [];
	const result = tryNormalise(primary);
	return {
		hasPrimary: Boolean(primary),
		backups: backups.length,
		valid: result.ok,
		error: result.error
	};
}
