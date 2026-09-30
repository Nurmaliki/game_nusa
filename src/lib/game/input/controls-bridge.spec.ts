import { describe, it, expect, beforeEach } from 'vitest';
import {
	registerControls,
	clearControls,
	hasControls,
	setVirtualMove,
	virtualPress,
	setVirtualHeld,
	type ControlHandle
} from './controls-bridge';
import type { InputAction } from './actions';
import type { Vec2 } from '$types/core';

function makeHandle() {
	const moves: Vec2[] = [];
	const presses: InputAction[] = [];
	const holds: { action: InputAction; held: boolean }[] = [];
	const handle: ControlHandle = {
		setMove: (v) => moves.push(v),
		press: (a) => presses.push(a),
		setHeld: (a, held) => holds.push({ action: a, held })
	};
	return { handle, moves, presses, holds };
}

describe('controls bridge', () => {
	beforeEach(() => clearControls());

	it('reports no controls before registration', () => {
		expect(hasControls()).toBe(false);
	});

	it('routes move/press/hold to the registered handle', () => {
		const { handle, moves, presses, holds } = makeHandle();
		registerControls(handle);
		expect(hasControls()).toBe(true);

		setVirtualMove({ x: 0.5, y: -0.25 });
		virtualPress('ATTACK');
		setVirtualHeld('SPRINT', true);
		setVirtualHeld('SPRINT', false);

		expect(moves).toEqual([{ x: 0.5, y: -0.25 }]);
		expect(presses).toEqual(['ATTACK']);
		expect(holds).toEqual([
			{ action: 'SPRINT', held: true },
			{ action: 'SPRINT', held: false }
		]);
	});

	it('is a no-op (no throw) when no handle is registered', () => {
		expect(() => {
			setVirtualMove({ x: 1, y: 1 });
			virtualPress('DODGE');
			setVirtualHeld('SPRINT', true);
		}).not.toThrow();
	});

	it('stops routing after clearControls', () => {
		const { handle, presses } = makeHandle();
		registerControls(handle);
		clearControls();
		virtualPress('INTERACT');
		expect(presses).toHaveLength(0);
	});
});
