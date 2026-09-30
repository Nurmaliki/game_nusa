import { describe, it, expect } from 'vitest';
import {
	validateSave,
	validateSaveFull,
	migrateSave,
	repairSave,
	buildSlotMeta
} from './migration';
import { CURRENT_SCHEMA_VERSION, type GameSave } from '$types/save';

function makeSave(overrides: Partial<GameSave> = {}): GameSave {
	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		gameVersion: '1.0.0',
		saveId: 'test',
		worldSeed: 123,
		createdAt: 0,
		updatedAt: 0,
		player: {
			position: { x: 0, y: 0 },
			biome: 'tropical_coast',
			health: 100,
			hunger: 100,
			thirst: 100,
			energy: 100,
			respawnPoint: null,
			isDead: false
		},
		inventory: { slots: [], capacity: 24, hotbarSize: 5 },
		equipment: { hotbar: [], weapon: null, armor: null },
		world: { seed: 123, chunkModifications: {}, harvestedNodes: [] },
		buildings: [],
		quests: [],
		npcs: [],
		skills: [],
		statistics: {
			itemsGathered: 0,
			itemsCrafted: 0,
			buildingsBuilt: 0,
			enemiesDefeated: 0,
			questsCompleted: 0,
			deaths: 0,
			playTimeMs: 0
		},
		settings: {
			masterVolume: 1,
			musicVolume: 1,
			sfxVolume: 1,
			uiScale: 1,
			reducedMotion: false,
			screenShake: true,
			damageFlash: true
		},
		gameTimeMs: 0,
		weather: 'clear',
		chapterComplete: false,
		...overrides
	};
}

describe('validateSave', () => {
	it('accepts a well-formed save', () => {
		expect(validateSave(makeSave()).ok).toBe(true);
	});

	it('rejects non-objects', () => {
		expect(validateSave(null).ok).toBe(false);
		expect(validateSave('nope').ok).toBe(false);
	});

	it('reports missing fields', () => {
		const s = makeSave();
		// @ts-expect-error deliberate removal
		delete s.player;
		const r = validateSave(s);
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.includes('player'))).toBe(true);
	});

	it('rejects saves from a newer schema', () => {
		const r = validateSave(makeSave({ schemaVersion: CURRENT_SCHEMA_VERSION + 5 }));
		expect(r.ok).toBe(false);
	});
});

describe('migrateSave', () => {
	it('passes through a current-version save unchanged', () => {
		const r = migrateSave(makeSave() as unknown as Record<string, unknown>);
		expect(r.ok).toBe(true);
		expect(r.appliedMigrations).toEqual([]);
	});

	it('refuses newer schemas', () => {
		const r = migrateSave(
			makeSave({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }) as unknown as Record<string, unknown>
		);
		expect(r.ok).toBe(false);
		expect(r.error).toContain('newer');
	});

	it('migrates a v1 save to v2, backfilling deaths + backpacks', () => {
		const v1 = makeSave() as unknown as Record<string, unknown>;
		v1.schemaVersion = 1;
		delete (v1.statistics as Record<string, unknown>).deaths;
		delete (v1.world as Record<string, unknown>).backpacks;

		const r = migrateSave(v1);
		expect(r.ok).toBe(true);
		expect(r.appliedMigrations).toEqual([1]);
		expect(r.data?.schemaVersion).toBe(2);
		expect(r.data?.statistics.deaths).toBe(0);
		expect(r.data?.world.backpacks).toEqual([]);
	});

	it('preserves existing statistics values while adding deaths', () => {
		const v1 = makeSave() as unknown as Record<string, unknown>;
		v1.schemaVersion = 1;
		(v1.statistics as Record<string, unknown>).itemsGathered = 42;
		delete (v1.statistics as Record<string, unknown>).deaths;

		const r = migrateSave(v1);
		expect(r.data?.statistics.itemsGathered).toBe(42);
		expect(r.data?.statistics.deaths).toBe(0);
	});

	it('refuses a gap in the migration chain', () => {
		const v0 = makeSave() as unknown as Record<string, unknown>;
		v0.schemaVersion = 0;
		const r = migrateSave(v0);
		expect(r.ok).toBe(false);
		expect(r.error).toContain('no migration path');
	});
});

describe('validateSave (deep)', () => {
	it('reports a warning when slot count != capacity', () => {
		const s = makeSave() as unknown as Record<string, unknown>;
		(s.inventory as Record<string, unknown>).slots = [];
		const r = validateSaveFull(s);
		expect(r.warnings.some((w) => w.includes('capacity'))).toBe(true);
	});

	it('rejects an unknown inventory item id as a warning (not an error)', () => {
		const s = makeSave({
			inventory: { slots: [{ id: 'definitely_not_real', qty: 1 }], capacity: 1, hotbarSize: 5 }
		});
		const r = validateSaveFull(s);
		// Referential drift is tolerated (content can change) but surfaced.
		expect(r.warnings.some((w) => w.includes('definitely_not_real'))).toBe(true);
	});

	it('rejects a non-positive stack quantity', () => {
		const s = makeSave({
			inventory: { slots: [{ id: 'wood', qty: 0 }], capacity: 1, hotbarSize: 5 }
		});
		expect(validateSaveFull(s).ok).toBe(false);
	});

	it('rejects an invalid quest state', () => {
		const s = makeSave({
			quests: [{ id: 'q1', state: 'BOGUS' as never, objectives: [] }]
		});
		expect(validateSaveFull(s).ok).toBe(false);
	});

	it('rejects a negative gameTimeMs', () => {
		expect(validateSaveFull(makeSave({ gameTimeMs: -5 })).ok).toBe(false);
	});
});

describe('repairSave', () => {
	it('repairs a save with corrupt numerics and unknown items', () => {
		const broken = makeSave() as unknown as Record<string, unknown>;
		player(broken).health = 'oops';
		inventory(broken).slots = [
			{ id: 'wood', qty: 3 },
			{ id: 'ghost_item', qty: 1 },
			{ id: 'stone', qty: -2 }
		];
		inventory(broken).capacity = 3;

		const r = repairSave(broken, 1000);
		expect(r.ok).toBe(true);
		expect(r.repairs.length).toBeGreaterThan(0);
		const slots = r.data!.inventory.slots as ({ id: string; qty: number } | null)[];
		expect(slots[0]).toEqual({ id: 'wood', qty: 3 });
		expect(slots[1]).toBeNull(); // unknown item dropped
		expect(slots[2]).toEqual({ id: 'stone', qty: 1 }); // qty coerced
		expect(r.data!.player.health).toBe(100);
	});

	it('never grants progression while repairing', () => {
		const broken = makeSave() as unknown as Record<string, unknown>;
		broken.quests = 'not-an-array';
		broken.statistics = undefined;
		const r = repairSave(broken, 1000);
		expect(r.ok).toBe(true);
		expect(r.data!.quests).toEqual([]);
	});
});

function player(o: Record<string, unknown>): Record<string, unknown> {
	return o.player as Record<string, unknown>;
}
function inventory(o: Record<string, unknown>): Record<string, unknown> {
	return o.inventory as Record<string, unknown>;
}

describe('buildSlotMeta', () => {
	it('produces a human summary', () => {
		const meta = buildSlotMeta(makeSave({ gameTimeMs: 1_440_000 }));
		expect(meta.summary).toContain('Hari');
		expect(meta.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});
});

describe('save round-trip fuzzing', () => {
	/** Tiny deterministic PRNG so failures are reproducible. */
	function mulberry32(seed: number): () => number {
		let a = seed >>> 0;
		return () => {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	it('survives 200 randomized mutate-validate-migrate cycles', () => {
		const rng = mulberry32(12345);
		for (let i = 0; i < 200; i++) {
			const save = makeSave({
				gameTimeMs: Math.floor(rng() * 1_000_000_000),
				worldSeed: Math.floor(rng() * 2 ** 32),
				chapterComplete: rng() > 0.5
			});
			const json = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
			const validation = validateSave(json);
			expect(validation.ok, `iteration ${i}`).toBe(true);

			const migrated = migrateSave(json);
			expect(migrated.ok, `iteration ${i}`).toBe(true);
			expect(migrated.data?.gameTimeMs).toBe(save.gameTimeMs);
			expect(migrated.data?.worldSeed).toBe(save.worldSeed);
			expect(migrated.data?.chapterComplete).toBe(save.chapterComplete);
		}
	});

	it('repair succeeds for every single-field deletion of a required collection', () => {
		const requiredArrays = ['buildings', 'quests', 'npcs', 'skills'] as const;
		for (const field of requiredArrays) {
			const save = makeSave() as unknown as Record<string, unknown>;
			delete save[field];
			// Validation rejects it, but repair restores the collection.
			expect(validateSave(save).ok, `validate without ${field}`).toBe(false);
			const repaired = repairSave(save, 1000);
			expect(repaired.ok, `repair without ${field}`).toBe(true);
			expect(Array.isArray(repaired.data![field])).toBe(true);
		}
	});

	it('repairs a save even when core containers are missing', () => {
		const save = makeSave() as unknown as Record<string, unknown>;
		delete save.player;
		delete save.inventory;
		delete save.equipment;
		delete save.world;
		expect(validateSave(save).ok).toBe(false);
		// Recovery must never crash and must restore the required shapes.
		const repaired = repairSave(save, 1000);
		expect(repaired.ok).toBe(true);
		expect(repaired.data?.player.health).toBe(100);
		expect(Array.isArray(repaired.data?.inventory.slots)).toBe(true);
		expect(repaired.data?.world.harvestedNodes).toEqual([]);
	});
});
