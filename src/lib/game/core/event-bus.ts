import type { GameEventMap, GameEventName } from '$types/events';

type Handler<K extends GameEventName> = (payload: GameEventMap[K]) => void;

/**
 * Typed event bridge between the game engine (Phaser) and the UI (Svelte).
 *
 * - No circular dependencies: depends only on shared event types.
 * - Listeners MUST be unsubscribed (the returned disposer) to avoid leaks.
 * - The bridge is a singleton accessed via `getGameBus()`.
 */
export class GameEventBus {
	private listeners = new Map<GameEventName, Set<(payload: unknown) => void>>();

	on<K extends GameEventName>(event: K, handler: Handler<K>): () => void {
		let set = this.listeners.get(event);
		if (!set) {
			set = new Set();
			this.listeners.set(event, set);
		}
		set.add(handler as (payload: unknown) => void);
		return () => this.off(event, handler);
	}

	off<K extends GameEventName>(event: K, handler: Handler<K>): void {
		this.listeners.get(event)?.delete(handler as (payload: unknown) => void);
	}

	emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): void {
		const set = this.listeners.get(event);
		if (!set) return;
		for (const handler of set) {
			try {
				(handler as Handler<K>)(payload);
			} catch (e) {
				// A faulty listener must never crash the game loop.
				console.error(`[GameEventBus] handler for ${event} threw`, e);
			}
		}
	}

	/** Remove every listener. Used when tearing down the whole game session. */
	clear(): void {
		this.listeners.clear();
	}
}

let bus: GameEventBus | null = null;

/** Singleton accessor. Safe to call during SSR (returns an inert bus). */
export function getGameBus(): GameEventBus {
	if (!bus) bus = new GameEventBus();
	return bus;
}
