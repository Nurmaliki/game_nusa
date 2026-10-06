<script lang="ts">
	import { ChunkManager } from '$game/world/chunk-manager';
	import { biomeLegend, drawMarker, paintWorldMap } from '$game/world/map-paint';
	import { getWorldMapStore, pollWorldMap } from '$stores/world-map.svelte';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getGameBus } from '$game/core/event-bus';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const map = getWorldMapStore();
	const session = getGameSession();

	pollWorldMap(200);

	const SIZE = 420;
	const RES = 210;

	let canvas = $state<HTMLCanvasElement | null>(null);
	let base: HTMLCanvasElement | null = null;
	let bakedSeed = -1;

	const legend = biomeLegend();

	function close(): void {
		open = false;
		getGameBus().emit('SFX', { id: 'ui_click' });
	}

	function ensureBase(seed: number, width: number, height: number): HTMLCanvasElement {
		if (base && seed === bakedSeed) return base;
		const off = document.createElement('canvas');
		off.width = SIZE;
		off.height = SIZE;
		const octx = off.getContext('2d');
		if (octx) {
			const manager = new ChunkManager(seed);
			paintWorldMap(
				octx,
				{ manager, worldWidth: width, worldHeight: height },
				{ size: SIZE, resolution: RES }
			);
		}
		base = off;
		bakedSeed = seed;
		return off;
	}

	$effect(() => {
		const seed = map.seed;
		const width = map.worldWidth;
		const height = map.worldHeight;
		const px = map.x;
		const py = map.y;
		const buildings = session.state?.buildings ?? [];

		if (!open || !canvas || width === 0 || height === 0) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(2, window.devicePixelRatio || 1);
		if (canvas.width !== SIZE * dpr) {
			canvas.width = SIZE * dpr;
			canvas.height = SIZE * dpr;
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const off = ensureBase(seed, width, height);
		ctx.clearRect(0, 0, SIZE, SIZE);
		ctx.drawImage(off, 0, 0, SIZE, SIZE);

		const manager = new ChunkManager(seed);
		const input = { manager, worldWidth: width, worldHeight: height };
		for (const b of buildings) {
			drawMarker(ctx, { x: b.position.x, y: b.position.y, color: '#f0b23c' }, input, SIZE);
		}
		drawMarker(ctx, { x: px, y: py, color: '#ff5d5d', ring: true }, input, SIZE);
	});
</script>

{#if open}
	<div
		class="u-scrim map-scrim"
		role="button"
		tabindex="-1"
		aria-label="Tutup peta"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
	></div>
	<div class="map-wrap" role="dialog" aria-modal="true" aria-label="Peta pulau">
		<div class="u-panel map-panel">
			<header class="u-header">
				<h2>Peta Pulau</h2>
				<button class="close" onclick={close} aria-label="Tutup">✕</button>
			</header>

			<div class="map-body">
				<div class="canvas-frame">
					<canvas bind:this={canvas} style="width: {SIZE}px; height: {SIZE}px"></canvas>
					<div class="pin" style="left: {map.fraction.x * 100}%; top: {map.fraction.y * 100}%">
						<span class="pin-dot"></span>
					</div>
				</div>

				<aside class="side">
					<h3>Wilayah</h3>
					<ul class="legend">
						{#each legend as l (l.id)}
							<li>
								<span class="swatch" style="background: {l.color}"></span>
								{l.name}
							</li>
						{/each}
					</ul>

					<h3 class="wide">Penanda</h3>
					<ul class="legend">
						<li><span class="swatch" style="background: #ff5d5d"></span> Lokasi kamu</li>
						<li><span class="swatch" style="background: #f0b23c"></span> Bangunan</li>
					</ul>
				</aside>
			</div>

			<footer class="hint">Tekan <kbd>M</kbd> atau <kbd>Esc</kbd> untuk menutup</footer>
		</div>
	</div>
{/if}

<style>
	.map-scrim {
		position: absolute;
		inset: 0;
		z-index: 40;
		pointer-events: auto;
	}
	.map-wrap {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		z-index: 41;
		pointer-events: none;
		padding: 16px;
	}
	.map-panel {
		pointer-events: auto;
		width: min(760px, 94vw);
		max-height: 92vh;
		overflow: auto;
		padding: 16px;
		animation: map-in 0.18s ease;
	}
	@keyframes map-in {
		from {
			transform: scale(0.96);
			opacity: 0;
		}
	}
	.u-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}
	.u-header h2 {
		margin: 0;
		font-size: 1.4rem;
		color: var(--amber);
		text-shadow: 0 2px 0 rgba(20, 12, 6, 0.4);
	}
	.close {
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		width: 38px;
		height: 38px;
		border-radius: var(--radius-pill);
		font-size: 1rem;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--wood-dark);
	}
	.close:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 var(--wood-dark);
	}
	.map-body {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.canvas-frame {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
		border: 3px solid var(--wood-dark);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
		background: #2a6d86;
		flex: 0 0 auto;
	}
	canvas {
		display: block;
		image-rendering: auto;
	}
	.pin {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}
	.pin-dot {
		display: block;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #ff5d5d;
		border: 2px solid #fff;
		box-shadow: 0 0 0 3px rgba(255, 93, 93, 0.35);
		animation: pulse 1.4s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 3px rgba(255, 93, 93, 0.35);
		}
		50% {
			box-shadow: 0 0 0 7px rgba(255, 93, 93, 0.12);
		}
	}
	.side {
		flex: 1 1 200px;
		min-width: 180px;
	}
	.side h3 {
		margin: 0 0 8px;
		font-size: 0.95rem;
		color: var(--green-light);
	}
	.side h3.wide {
		margin-top: 16px;
	}
	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}
	.swatch {
		width: 16px;
		height: 16px;
		border-radius: 5px;
		border: 1.5px solid rgba(20, 12, 6, 0.5);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
		flex: 0 0 auto;
	}
	.hint {
		margin-top: 14px;
		text-align: center;
		font-size: 0.78rem;
		color: var(--ink-muted);
	}
	kbd {
		background: rgba(20, 12, 6, 0.5);
		border-radius: 6px;
		padding: 1px 7px;
		border: 1px solid var(--border-strong);
		font-family: var(--font-numeric);
		font-size: 0.75rem;
		color: var(--ink);
	}
</style>
