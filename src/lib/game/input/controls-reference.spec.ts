import { describe, it, expect } from 'vitest';
import { buildControlsReference, formatKey } from './controls-reference';
import { ACTION_BINDINGS, type InputAction } from './actions';

describe('formatKey', () => {
	it('names special keys readably', () => {
		expect(formatKey(' ')).toBe('Spasi');
		expect(formatKey('arrowup')).toBe('↑');
		expect(formatKey('arrowdown')).toBe('↓');
		expect(formatKey('arrowleft')).toBe('←');
		expect(formatKey('arrowright')).toBe('→');
		expect(formatKey('shift')).toBe('Shift');
		expect(formatKey('escape')).toBe('Esc');
	});

	it('upper-cases single-character keys', () => {
		expect(formatKey('w')).toBe('W');
		expect(formatKey('1')).toBe('1');
	});
});

describe('buildControlsReference', () => {
	const ref = buildControlsReference();

	it('covers every bound action exactly once', () => {
		const boundActions = new Set<InputAction>(Object.values(ACTION_BINDINGS));
		const covered = new Set<InputAction>(ref.map((c) => c.action));
		// The hotbar collapses to HOTBAR_1, so its 4 siblings are intentionally
		// folded in; every other bound action must appear.
		for (const a of boundActions) {
			if (a.startsWith('HOTBAR_')) continue;
			expect(covered.has(a), `missing ${a}`).toBe(true);
		}
		expect(covered.has('HOTBAR_1')).toBe(true);
		// No duplicates.
		expect(covered.size).toBe(ref.length);
	});

	it('folds the hotbar slots into a single "1–5" row', () => {
		const hotbarRows = ref.filter((c) => c.action.startsWith('HOTBAR_'));
		expect(hotbarRows).toHaveLength(1);
		expect(hotbarRows[0].keys).toBe('1–5');
	});

	it('shows both aliases for movement (WASD + arrows)', () => {
		const up = ref.find((c) => c.action === 'MOVE_UP');
		expect(up?.keys).toBe('W / ↑');
	});

	it('gives every row a non-empty label and key string', () => {
		for (const c of ref) {
			expect(c.label.length, `label for ${c.action}`).toBeGreaterThan(0);
			expect(c.keys.length, `keys for ${c.action}`).toBeGreaterThan(0);
		}
	});

	it('is deterministic across calls', () => {
		expect(buildControlsReference()).toEqual(ref);
	});
});
