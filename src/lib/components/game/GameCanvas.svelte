<script lang="ts">
	import { onMount } from 'svelte';
	import { getGameBus } from '$game/core/event-bus';
	import { log } from '$game/core/logger';
	import { dev } from '$app/environment';

	let container: HTMLDivElement;
	let ready = $state(false);
	/** Phaser.Game is only typed here; the engine loads lazily (see below). */
	let game: { destroy(removeCanvas: boolean): void } | null = null;

	onMount(() => {
		if (!container) return;
		const bus = getGameBus();
		const off = bus.on('GAME_STATE_READY', () => (ready = true));
		let cancelled = false;

		void (async () => {
			try {
				// Lazy-load the engine so the Svelte shell (HUD/panels) paints before
				// the ~1.4 MB Phaser bundle is parsed. Keeps first paint fast.
				const [{ createGame }, { assertContentValid }] = await Promise.all([
					import('$game/core/game-config'),
					import('$game/content/validation')
				]);
				// Content errors should never ship silently in development.
				if (dev) assertContentValid();
				if (cancelled || !container) return;
				game = await createGame({ parent: container, bus });
			} catch (e) {
				log.error('GAME', 'Failed to start Phaser', e);
				bus.emit('GAME_ERROR', {
					category: 'GAME',
					message: 'The game engine failed to start. Your browser may not support WebGL.',
					recoverable: false
				});
			}
		})();

		return () => {
			cancelled = true;
			off();
			game?.destroy(true);
			game = null;
		};
	});
</script>

<div
	class="game-root"
	bind:this={container}
	data-engine-ready={ready ? 'true' : 'false'}
	aria-label="Nusantara Survival game canvas"
></div>

{#if !ready}
	<div class="loading">Menyalakan mesin permainan…</div>
{/if}

<style>
	.game-root {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
		overscroll-behavior: none;
	}
	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: #0b1220;
		color: #cbd5e0;
		font-family: system-ui, sans-serif;
	}
</style>
