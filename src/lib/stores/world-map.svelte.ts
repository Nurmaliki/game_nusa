import { getGameSession } from '$stores/game-session.svelte';
import { BALANCE } from '$game/config/balance';
import { onMount } from 'svelte';

/**
 * World-map store (§ UI).
 *
 * Derives the player's map position from the live GameState (which the scene
 * keeps up to date every frame). Reading the session directly — rather than an
 * engine event — keeps the map fully decoupled from the Phaser scene. The island
 * dimensions are computed from the world config so they are correct even before
 * the first tick.
 */
class WorldMapStore {
	x = $state(0);
	y = $state(0);
	seed = $state(0);
	/** True once the world has a live position to show. */
	ready = $state(false);

	get worldWidth(): number {
		return BALANCE.world.worldChunksX * BALANCE.world.chunkSizeTiles * BALANCE.world.tileSize;
	}

	get worldHeight(): number {
		return BALANCE.world.worldChunksY * BALANCE.world.chunkSizeTiles * BALANCE.world.tileSize;
	}

	/** Pull the current position/seed out of the session. Cheap; safe to poll. */
	poll(): void {
		const state = getGameSession().state;
		if (!state) return;
		this.x = state.player.position.x;
		this.y = state.player.position.y;
		this.seed = state.worldSeed;
		this.ready = true;
	}

	/** Player position as a 0..1 fraction of the island. */
	get fraction(): { x: number; y: number } {
		const w = this.worldWidth || 1;
		const h = this.worldHeight || 1;
		return {
			x: Math.max(0, Math.min(1, this.x / w)),
			y: Math.max(0, Math.min(1, this.y / h))
		};
	}
}

let store: WorldMapStore | null = null;

export function getWorldMapStore(): WorldMapStore {
	if (!store) store = new WorldMapStore();
	return store;
}

/**
 * Poll the session on a light interval while the component is mounted. Uses
 * `$state`-backed fields so consumers react automatically. Must be called from
 * a component's setup (it registers an `onMount` timer).
 */
export function pollWorldMap(intervalMs = 150): void {
	const s = getWorldMapStore();
	s.poll();
	onMount(() => {
		const timer = setInterval(() => s.poll(), intervalMs);
		return () => clearInterval(timer);
	});
}

export type { WorldMapStore };
