import type { GameSave, SaveSlotMeta } from '$types/save';
import { CURRENT_SCHEMA_VERSION } from '$types/save';
import { ITEMS } from '$lib/data/items';

/**
 * Pure save validation + migration (see §26–§28 / §60).
 * Contains NO IndexedDB code so it can be unit-tested in node.
 */

export interface ValidationResult {
	ok: boolean;
	errors: string[];
	/** Non-fatal issues that were repaired/coerced during validation. */
	warnings: string[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

/** Deep, content-aware validation used both on import and on every load. */
export function validateSaveFull(data: unknown): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	if (typeof data !== 'object' || data === null) {
		return { ok: false, errors: ['save is not an object'], warnings };
	}
	const obj = data as Record<string, unknown>;

	// ── Presence of the required top-level fields ──────────────────────
	for (const key of REQUIRED_TOP_LEVEL) {
		if (!(key in obj)) errors.push(`missing field: ${key}`);
	}
	if (errors.length > 0) return { ok: false, errors, warnings };

	if (!isNum(obj.schemaVersion)) errors.push('schemaVersion must be a number');
	else if (obj.schemaVersion > CURRENT_SCHEMA_VERSION) {
		errors.push(
			`save schema v${obj.schemaVersion} is newer than supported v${CURRENT_SCHEMA_VERSION}`
		);
	}
	if (!isStr(obj.saveId) || obj.saveId.length === 0)
		errors.push('saveId must be a non-empty string');
	if (!isNum(obj.worldSeed)) errors.push('worldSeed must be a number');

	// ── Player ──────────────────────────────────────────────────────────
	const player = obj.player as Record<string, unknown> | undefined;
	if (!player || typeof player !== 'object') {
		errors.push('player must be an object');
	} else {
		for (const k of ['health', 'hunger', 'thirst', 'energy'] as const) {
			if (!isNum(player[k])) errors.push(`player.${k} must be a number`);
		}
		const pos = player.position as Record<string, unknown> | undefined;
		if (!pos || !isNum(pos.x) || !isNum(pos.y))
			errors.push('player.position must be {x,y} numbers');
	}

	// ── Inventory (structure + item referential integrity) ─────────────
	const inv = obj.inventory as Record<string, unknown> | undefined;
	if (!inv || typeof inv !== 'object') {
		errors.push('inventory must be an object');
	} else {
		if (!Array.isArray(inv.slots)) errors.push('inventory.slots must be an array');
		else if (inv.slots.length !== inv.capacity) {
			warnings.push(
				`inventory.slots length ${inv.slots.length} != capacity ${String(inv.capacity)}`
			);
		}
		if (!isNum(inv.capacity) || inv.capacity <= 0) errors.push('inventory.capacity must be > 0');
		if (!isNum(inv.hotbarSize)) errors.push('inventory.hotbarSize must be a number');
		if (Array.isArray(inv.slots)) {
			for (let i = 0; i < inv.slots.length; i++) {
				const slot = inv.slots[i] as Record<string, unknown> | null;
				if (slot === null || slot === undefined) continue;
				if (!isStr(slot.id)) {
					errors.push(`inventory.slots[${i}].id must be a string`);
					continue;
				}
				if (!ITEMS[slot.id])
					warnings.push(`inventory.slots[${i}] references unknown item "${slot.id}"`);
				if (!isNum(slot.qty) || slot.qty <= 0) {
					errors.push(`inventory.slots[${i}].qty must be > 0`);
				}
			}
		}
	}

	// ── Equipment ───────────────────────────────────────────────────────
	const equip = obj.equipment as Record<string, unknown> | undefined;
	if (!equip || typeof equip !== 'object') errors.push('equipment must be an object');
	else if (!Array.isArray(equip.hotbar)) errors.push('equipment.hotbar must be an array');

	// ── World ───────────────────────────────────────────────────────────
	const world = obj.world as Record<string, unknown> | undefined;
	if (!world || typeof world !== 'object') {
		errors.push('world must be an object');
	} else {
		if (!isNum(world.seed)) errors.push('world.seed must be a number');
		if (!Array.isArray(world.harvestedNodes)) errors.push('world.harvestedNodes must be an array');
		if (world.chunkModifications !== undefined && typeof world.chunkModifications !== 'object') {
			errors.push('world.chunkModifications must be an object');
		}
	}

	if (!Array.isArray(obj.buildings)) errors.push('buildings must be an array');
	if (!Array.isArray(obj.quests)) errors.push('quests must be an array');
	if (!Array.isArray(obj.npcs)) errors.push('npcs must be an array');
	if (!Array.isArray(obj.skills)) errors.push('skills must be an array');

	// Quest states must be a known value.
	if (Array.isArray(obj.quests)) {
		const valid = new Set(['LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETABLE', 'COMPLETED']);
		for (const q of obj.quests as Record<string, unknown>[]) {
			if (q && typeof q === 'object' && isStr(q.state) && !valid.has(q.state)) {
				errors.push(`quest "${String(q.id)}" has invalid state "${q.state}"`);
			}
		}
	}

	if (!isNum(obj.gameTimeMs) || obj.gameTimeMs < 0) errors.push('gameTimeMs must be >= 0');
	if (!isNum(obj.createdAt)) errors.push('createdAt must be a number');
	if (!isNum(obj.updatedAt)) errors.push('updatedAt must be a number');
	if (typeof obj.chapterComplete !== 'boolean') errors.push('chapterComplete must be a boolean');

	const settings = obj.settings as Record<string, unknown> | undefined;
	if (!settings || typeof settings !== 'object') errors.push('settings must be an object');
	else if (!isNum(settings.masterVolume)) errors.push('settings.masterVolume must be a number');

	return { ok: errors.length === 0, errors, warnings };
}

const REQUIRED_TOP_LEVEL: (keyof GameSave)[] = [
	'schemaVersion',
	'gameVersion',
	'saveId',
	'worldSeed',
	'createdAt',
	'updatedAt',
	'player',
	'inventory',
	'equipment',
	'world',
	'buildings',
	'quests',
	'npcs',
	'skills',
	'statistics',
	'settings',
	'gameTimeMs',
	'weather',
	'chapterComplete'
];

/** Structural validation of a parsed save object (deep, content-aware). */
export function validateSave(data: unknown): ValidationResult {
	return validateSaveFull(data);
}

/**
 * Migration pipeline. Each entry migrates from `from` to `from + 1`.
 * Migrations are deterministic, non-destructive, and backward-aware.
 */
type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
	// v1 -> v2: records the number of player deaths (new stat) and normalises the
	// backpack list to always be present so downstream readers can rely on it.
	1: (data) => {
		const statistics = (data.statistics as Record<string, unknown>) ?? {};
		const world = (data.world as Record<string, unknown>) ?? {};
		return {
			...data,
			statistics: { deaths: 0, ...statistics },
			world: { backpacks: [], ...world },
			schemaVersion: 2
		};
	}
};

export interface MigrateResult {
	ok: boolean;
	data?: GameSave;
	error?: string;
	appliedMigrations: number[];
}

/** Migrate a parsed save up to CURRENT_SCHEMA_VERSION. */
export function migrateSave(data: Record<string, unknown>): MigrateResult {
	let current = { ...data };
	const applied: number[] = [];
	let version = typeof current.schemaVersion === 'number' ? current.schemaVersion : 0;

	if (version > CURRENT_SCHEMA_VERSION) {
		return {
			ok: false,
			error: `save schema v${version} is newer than supported v${CURRENT_SCHEMA_VERSION}`,
			appliedMigrations: []
		};
	}

	while (version < CURRENT_SCHEMA_VERSION) {
		const migration = MIGRATIONS[version];
		if (!migration) {
			return {
				ok: false,
				error: `no migration path from v${version} to v${version + 1}`,
				appliedMigrations: applied
			};
		}
		current = migration(current);
		version += 1;
		current.schemaVersion = version;
		applied.push(version - 1);
	}

	return { ok: true, data: current as unknown as GameSave, appliedMigrations: applied };
}

export interface RepairResult {
	ok: boolean;
	data?: GameSave;
	/** Human-readable list of the repairs that were applied. */
	repairs: string[];
}

/**
 * Best-effort repair of a structurally-broken save (see §44 corruption
 * recovery). Used when validation fails but the player would otherwise lose
 * their slot: unknown inventory items are dropped, non-finite numbers are
 * clamped to safe defaults and missing optional collections are backfilled.
 * Never invents progression: progression fields are only defaulted, never
 * granted.
 */
export function repairSave(data: Record<string, unknown>, now: number): RepairResult {
	const repairs: string[] = [];
	// First bring the schema up to date (migrations may already fix things).
	const migrated = migrateSave(data);
	if (!migrated.ok || !migrated.data) {
		return { ok: false, repairs };
	}
	const save = migrated.data as unknown as GameSave & Record<string, unknown>;

	const clampNum = (v: unknown, fallback: number, label: string): number => {
		if (typeof v === 'number' && Number.isFinite(v)) return v;
		repairs.push(`${label} reset to ${fallback}`);
		return fallback;
	};

	// Player numeric fields. A corrupted save may be missing `player` entirely;
	// recreate a safe default rather than crashing the recovery path.
	if (!save.player || typeof save.player !== 'object') {
		(save as Record<string, unknown>).player = {
			position: { x: 0, y: 0 },
			biome: 'tropical_coast',
			health: 100,
			hunger: 100,
			thirst: 100,
			energy: 100,
			respawnPoint: null,
			isDead: false
		};
		repairs.push('player recreated with defaults');
	}
	const player = save.player as unknown as Record<string, unknown>;
	for (const k of ['health', 'hunger', 'thirst', 'energy'] as const) {
		player[k] = clampNum(player[k], 100, `player.${k}`);
	}
	if (!player.position || typeof player.position !== 'object') {
		player.position = { x: 0, y: 0 };
		repairs.push('player.position reset to origin');
	}

	// Inventory: a corrupted save may be missing the whole container.
	if (!save.inventory || typeof save.inventory !== 'object') {
		(save as Record<string, unknown>).inventory = { slots: [], capacity: 24, hotbarSize: 5 };
		repairs.push('inventory recreated with defaults');
	}

	// Equipment / world: ensure the shapes downstream readers rely on exist.
	if (!save.equipment || typeof save.equipment !== 'object') {
		(save as Record<string, unknown>).equipment = { hotbar: [], weapon: null, armor: null };
		repairs.push('equipment recreated with defaults');
	}
	if (!save.world || typeof save.world !== 'object') {
		(save as Record<string, unknown>).world = {
			seed: (save as unknown as Record<string, unknown>).worldSeed ?? 1,
			chunkModifications: {},
			harvestedNodes: []
		};
		repairs.push('world recreated with defaults');
	}

	// Inventory: drop unknown-item slots, coerce qty.
	const inv = save.inventory as unknown as Record<string, unknown>;
	if (Array.isArray(inv.slots)) {
		inv.slots = (inv.slots as (Record<string, unknown> | null)[]).map((slot, i) => {
			if (!slot || typeof slot !== 'object') return null;
			const id = slot.id;
			if (typeof id !== 'string' || !ITEMS[id]) {
				if (slot.id !== undefined) repairs.push(`inventory.slots[${i}] dropped (unknown item)`);
				return null;
			}
			if (typeof slot.qty !== 'number' || slot.qty <= 0) {
				repairs.push(`inventory.slots[${i}].qty coerced to 1`);
				return { ...slot, qty: 1 };
			}
			return slot;
		});
	}

	// Required numeric fields.
	save.gameTimeMs = clampNum(save.gameTimeMs, 0, 'gameTimeMs');
	save.createdAt = clampNum(save.createdAt, now, 'createdAt');
	save.updatedAt = clampNum(save.updatedAt, now, 'updatedAt');
	save.worldSeed = clampNum(save.worldSeed, 1, 'worldSeed');
	if (typeof save.chapterComplete !== 'boolean') save.chapterComplete = false;

	// Optional collections.
	if (!Array.isArray(save.buildings)) {
		save.buildings = [];
		repairs.push('buildings reset to []');
	}
	if (!Array.isArray(save.quests)) {
		save.quests = [];
		repairs.push('quests reset to []');
	}
	if (!Array.isArray(save.npcs)) {
		save.npcs = [];
		repairs.push('npcs reset to []');
	}
	if (!Array.isArray(save.skills)) {
		save.skills = [];
		repairs.push('skills reset to []');
	}

	const revalidation = validateSave(save);
	if (!revalidation.ok) return { ok: false, repairs };
	return { ok: true, data: save as GameSave, repairs };
}

/** Build a lightweight summary for the save/load menu. */
export function buildSlotMeta(save: GameSave): SaveSlotMeta {
	const hours = Math.floor(save.gameTimeMs / 60000);
	const summaryParts: string[] = [`Hari ${Math.floor(hours / 24) + 1}`];
	if (save.chapterComplete) summaryParts.push('Bab I Selesai');
	else summaryParts.push(`${save.quests.filter((q) => q.state === 'COMPLETED').length} misi`);
	return {
		saveId: save.saveId,
		gameVersion: save.gameVersion,
		schemaVersion: save.schemaVersion,
		createdAt: save.createdAt,
		updatedAt: save.updatedAt,
		playTimeMs: save.statistics.playTimeMs,
		summary: summaryParts.join(' · ')
	};
}
