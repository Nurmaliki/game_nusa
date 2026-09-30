import { describe, it, expect } from 'vitest';
import { ACTION_BINDINGS, HOTBAR_ACTIONS, type InputAction } from './actions';

const ALL_ACTIONS: InputAction[] = [
	'MOVE_UP',
	'MOVE_DOWN',
	'MOVE_LEFT',
	'MOVE_RIGHT',
	'SPRINT',
	'INTERACT',
	'ATTACK',
	'HEAVY_ATTACK',
	'BLOCK',
	'DODGE',
	'INVENTORY',
	'CRAFTING',
	'BUILD',
	'ROTATE',
	'QUESTS',
	'MAP',
	'PAUSE',
	'HOTBAR_1',
	'HOTBAR_2',
	'HOTBAR_3',
	'HOTBAR_4',
	'HOTBAR_5'
];

describe('action bindings', () => {
	it('uses lower-case canonical keys (matches normalised DOM key handling)', () => {
		for (const key of Object.keys(ACTION_BINDINGS)) {
			expect(key, `binding key "${key}"`).toBe(key.toLowerCase());
		}
	});

	it('maps every binding to a known InputAction', () => {
		const valid = new Set<string>(ALL_ACTIONS);
		for (const [key, action] of Object.entries(ACTION_BINDINGS)) {
			expect(valid.has(action), `${key} -> ${action}`).toBe(true);
		}
	});

	it('binds all core movement and combat actions', () => {
		const bound = new Set(Object.values(ACTION_BINDINGS));
		for (const a of [
			'MOVE_UP',
			'MOVE_DOWN',
			'MOVE_LEFT',
			'MOVE_RIGHT',
			'ATTACK',
			'HEAVY_ATTACK',
			'DODGE',
			'INTERACT',
			'BUILD',
			'CRAFTING',
			'INVENTORY'
		] as InputAction[]) {
			expect(bound.has(a), `unbound action ${a}`).toBe(true);
		}
	});

	it('gives every hotbar slot exactly one distinct key', () => {
		const hotbarKeys: string[] = [];
		for (const [key, action] of Object.entries(ACTION_BINDINGS)) {
			if ((HOTBAR_ACTIONS as string[]).includes(action)) hotbarKeys.push(key);
		}
		expect(new Set(hotbarKeys).size).toBe(HOTBAR_ACTIONS.length);
	});

	it('binds each WASD direction to distinct actions', () => {
		const dirs = ['w', 'a', 's', 'd'].map((k) => ACTION_BINDINGS[k]);
		expect(new Set(dirs).size).toBe(4);
	});

	it('never maps two movement directions to the same action', () => {
		// Aliases (arrows) are allowed, but each direction action is unique.
		const moveActions = Object.entries(ACTION_BINDINGS)
			.filter(([k]) => k.startsWith('arrow') || ['w', 'a', 's', 'd'].includes(k))
			.map(([, a]) => a);
		expect(new Set(moveActions).size).toBe(4);
	});

	it('hotbar actions are in canonical 1..5 order', () => {
		expect(HOTBAR_ACTIONS).toEqual(['HOTBAR_1', 'HOTBAR_2', 'HOTBAR_3', 'HOTBAR_4', 'HOTBAR_5']);
	});
});
