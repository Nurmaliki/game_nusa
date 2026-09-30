import { describe, it, expect, vi } from 'vitest';
import { GameEventBus } from './event-bus';

describe('GameEventBus', () => {
	it('delivers typed payloads to subscribers', () => {
		const bus = new GameEventBus();
		const handler = vi.fn();
		bus.on('TIME_CHANGED', handler);
		bus.emit('TIME_CHANGED', { fraction: 0.5, day: 1, phase: 'midday', clock: '12:00' });
		expect(handler).toHaveBeenCalledOnce();
		expect(handler.mock.calls[0][0].day).toBe(1);
	});

	it('unsubscribes via the returned disposer', () => {
		const bus = new GameEventBus();
		const handler = vi.fn();
		const off = bus.on('GAME_PAUSED', handler);
		off();
		bus.emit('GAME_PAUSED', undefined);
		expect(handler).not.toHaveBeenCalled();
	});

	it('does not let a throwing handler break other handlers', () => {
		const bus = new GameEventBus();
		const bad = vi.fn(() => {
			throw new Error('boom');
		});
		const good = vi.fn();
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		bus.on('TOAST', bad);
		bus.on('TOAST', good);
		bus.emit('TOAST', { text: 'hi', kind: 'info' });
		expect(good).toHaveBeenCalledOnce();
		spy.mockRestore();
	});

	it('clear removes all listeners', () => {
		const bus = new GameEventBus();
		const handler = vi.fn();
		bus.on('GAME_RESUMED', handler);
		bus.clear();
		bus.emit('GAME_RESUMED', undefined);
		expect(handler).not.toHaveBeenCalled();
	});
});
