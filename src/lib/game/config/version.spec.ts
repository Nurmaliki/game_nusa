import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GAME_VERSION, CURRENT_SCHEMA_VERSION } from './version';

/**
 * Release guard (Phase 15): the version surfaced in the UI must stay in lockstep
 * with package.json, so a release bump can never half-apply.
 */
describe('version metadata', () => {
	const pkg = JSON.parse(
		readFileSync(fileURLToPath(new URL('../../../../package.json', import.meta.url)), 'utf8')
	) as { version: string };

	it('GAME_VERSION matches package.json', () => {
		expect(GAME_VERSION).toBe(pkg.version);
	});

	it('GAME_VERSION is a semver triple', () => {
		expect(GAME_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it('CURRENT_SCHEMA_VERSION is a positive integer', () => {
		expect(Number.isInteger(CURRENT_SCHEMA_VERSION)).toBe(true);
		expect(CURRENT_SCHEMA_VERSION).toBeGreaterThan(0);
	});
});
