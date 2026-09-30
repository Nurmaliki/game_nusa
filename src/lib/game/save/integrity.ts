import type { GameSave } from '$types/save';

/**
 * Save integrity + versioned export envelope (see §26–§28 / §44).
 *
 * Exports are wrapped in a self-describing envelope carrying a format tag,
 * an envelope version and a checksum of the payload. On import we recompute the
 * checksum so corrupted or hand-edited files are rejected before they ever
 * touch IndexedDB. All pure — no IndexedDB, no DOM — so it is unit-testable.
 */

/** Marker so we can tell our files apart from arbitrary JSON. */
export const EXPORT_FORMAT = 'nusantara-save';
/** Envelope version (independent of the save schemaVersion). */
export const EXPORT_ENVELOPE_VERSION = 1;

export interface SaveEnvelope {
	format: typeof EXPORT_FORMAT;
	envelopeVersion: number;
	/** Save schema version mirrored for quick inspection without parsing. */
	schemaVersion: number;
	gameVersion: string;
	exportedAt: number;
	/** FNV-1a hex digest of the canonical JSON payload. */
	checksum: string;
	/** The actual save. */
	data: GameSave;
}

/**
 * Deterministic FNV-1a 32-bit hash rendered as 8 hex chars.
 * Not cryptographic — it detects accidental corruption and casual edits,
 * which is all a client-side single-player save needs.
 */
export function fnv1a(text: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		// 32-bit FNV prime multiply via shifts to stay in int range.
		hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
	}
	return hash.toString(16).padStart(8, '0');
}

/** Stable stringify: sorts object keys so the hash ignores key order. */
export function canonicalize(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'null';
	if (typeof value !== 'object') return JSON.stringify(value) ?? 'null';
	if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
	const obj = value as Record<string, unknown>;
	// Match JSON.stringify semantics: keys with `undefined` values are omitted.
	const keys = Object.keys(obj)
		.filter((k) => obj[k] !== undefined)
		.sort();
	return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

/** Compute the checksum of a save payload. */
export function checksumOf(save: GameSave): string {
	return fnv1a(canonicalize(save));
}

/** Wrap a save in a versioned, checksummed envelope. */
export function wrapSave(save: GameSave, now: number): SaveEnvelope {
	return {
		format: EXPORT_FORMAT,
		envelopeVersion: EXPORT_ENVELOPE_VERSION,
		schemaVersion: save.schemaVersion,
		gameVersion: save.gameVersion,
		exportedAt: now,
		checksum: checksumOf(save),
		data: save
	};
}

export interface UnwrapResult {
	ok: boolean;
	/** The raw save object (unvalidated — caller runs validate/migrate). */
	data?: Record<string, unknown>;
	error?: string;
}

/**
 * Parse a possibly-enveloped export string into a raw save object.
 * Accepts both the wrapped envelope and a bare legacy save object so old
 * exports keep working.
 */
export function unwrapSave(text: string): UnwrapResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return { ok: false, error: 'invalid_json' };
	}
	if (typeof parsed !== 'object' || parsed === null) {
		return { ok: false, error: 'not_an_object' };
	}
	const obj = parsed as Record<string, unknown>;

	// Legacy / bare save: no envelope format tag.
	if (obj.format !== EXPORT_FORMAT) {
		if (!('saveId' in obj) && !('schemaVersion' in obj)) {
			return { ok: false, error: 'unrecognised_format' };
		}
		return { ok: true, data: obj };
	}

	// Enveloped: verify structure + checksum.
	if (typeof obj.envelopeVersion !== 'number') {
		return { ok: false, error: 'missing_envelope_version' };
	}
	if (obj.envelopeVersion > EXPORT_ENVELOPE_VERSION) {
		return {
			ok: false,
			error: `envelope v${obj.envelopeVersion} is newer than supported v${EXPORT_ENVELOPE_VERSION}`
		};
	}
	const data = obj.data;
	if (typeof data !== 'object' || data === null) {
		return { ok: false, error: 'missing_payload' };
	}
	const expected = typeof obj.checksum === 'string' ? obj.checksum : '';
	const actual = checksumOf(data as GameSave);
	if (expected !== actual) {
		return { ok: false, error: 'checksum_mismatch' };
	}
	return { ok: true, data: data as Record<string, unknown> };
}

/** Serialise a save to a pretty-printed, checksummed export string. */
export function serializeExport(save: GameSave, now: number): string {
	return JSON.stringify(wrapSave(save, now), null, 2);
}
