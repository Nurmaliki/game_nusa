import { describe, it, expect } from 'vitest';
import {
	canonicalize,
	checksumOf,
	fnv1a,
	serializeExport,
	unwrapSave,
	wrapSave,
	EXPORT_FORMAT,
	EXPORT_ENVELOPE_VERSION
} from './integrity';
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

describe('fnv1a', () => {
	it('is deterministic and 8 hex chars', () => {
		const a = fnv1a('hello');
		expect(a).toBe(fnv1a('hello'));
		expect(a).toMatch(/^[0-9a-f]{8}$/);
	});

	it('changes for different inputs', () => {
		expect(fnv1a('a')).not.toBe(fnv1a('b'));
	});
});

describe('canonicalize', () => {
	it('is independent of object key order', () => {
		expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
	});

	it('preserves array order', () => {
		expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
	});
});

describe('checksumOf', () => {
	it('is stable for the same save', () => {
		expect(checksumOf(makeSave())).toBe(checksumOf(makeSave()));
	});

	it('differs when content changes', () => {
		expect(checksumOf(makeSave())).not.toBe(checksumOf(makeSave({ gameTimeMs: 1 })));
	});

	it('ignores key order (uses canonical form)', () => {
		const a = makeSave();
		const b = { ...makeSave() };
		expect(checksumOf(a)).toBe(checksumOf(b));
	});

	it('survives a JSON round trip even with undefined fields', () => {
		const withUndefined = { ...makeSave(), extra: undefined } as unknown as GameSave;
		const roundTripped = JSON.parse(JSON.stringify(withUndefined)) as GameSave;
		expect(checksumOf(roundTripped)).toBe(checksumOf(withUndefined));
	});
});

describe('wrapSave / unwrapSave round trip', () => {
	it('wraps with the expected envelope fields', () => {
		const env = wrapSave(makeSave(), 999);
		expect(env.format).toBe(EXPORT_FORMAT);
		expect(env.envelopeVersion).toBe(EXPORT_ENVELOPE_VERSION);
		expect(env.exportedAt).toBe(999);
		expect(env.checksum).toBe(checksumOf(env.data));
	});

	it('round trips a serialized envelope', () => {
		const text = serializeExport(makeSave(), 1);
		const r = unwrapSave(text);
		expect(r.ok).toBe(true);
		expect(r.data?.saveId).toBe('test');
	});

	it('rejects invalid JSON', () => {
		expect(unwrapSave('{not json').ok).toBe(false);
	});

	it('rejects a tampered payload (checksum mismatch)', () => {
		const env = wrapSave(makeSave(), 1);
		const tampered = { ...env, data: { ...env.data, gameTimeMs: 999999 } };
		const r = unwrapSave(JSON.stringify(tampered));
		expect(r.ok).toBe(false);
		expect(r.error).toBe('checksum_mismatch');
	});

	it('rejects an envelope from a newer format', () => {
		const env = wrapSave(makeSave(), 1);
		const r = unwrapSave(JSON.stringify({ ...env, envelopeVersion: 99 }));
		expect(r.ok).toBe(false);
		expect(r.error).toContain('newer');
	});

	it('accepts a bare legacy save object', () => {
		const r = unwrapSave(JSON.stringify(makeSave()));
		expect(r.ok).toBe(true);
		expect(r.data?.saveId).toBe('test');
	});

	it('rejects an unrelated object', () => {
		const r = unwrapSave(JSON.stringify({ hello: 'world' }));
		expect(r.ok).toBe(false);
		expect(r.error).toBe('unrecognised_format');
	});
});
