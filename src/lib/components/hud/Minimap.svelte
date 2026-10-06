<script lang="ts">
	import { ChunkManager } from '$game/world/chunk-manager';
	import { drawMarker, paintWorldMap } from '$game/world/map-paint';
	import { getWorldMapStore, pollWorldMap } from '$stores/world-map.svelte';

	let { corner = 'bl' }: { corner?: 'bl' | 'tr' } = $props();

	/**
	 * Corner minimap: a live miniature of the island with the player marker.
	 * Uses an internal ChunkManager (Phaser-free) so it paints identically to the
	 * full map and the world itself. The island is baked once into an offscreen
	 * buffer; each position update just blits it and stamps the marker.
	 */
	const map = getWorldMapStore();

	// Poll the session for the live player position (decoupled from Phaser).
	pollWorldMap(150);

	const SIZE = 148;
	const RES = 72;

	let canvas = $state<HTMLCanvasElement | null>(null);
	let base: HTMLCanvasElement | null = null;
	let bakedSeed = -1;

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
		if (!canvas || width === 0 || height === 0) return;

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
		drawMarker(
			ctx,
			{ x: px, y: py, color: '#ff5d5d', ring: true },
			{ manager, worldWidth: width, worldHeight: height },
			SIZE
		);
	});
</script>

<div class="minimap {corner}" style="--mm-size: {SIZE}px" aria-label="Peta mini">
	<canvas bind:this={canvas} style="width: {SIZE}px; height: {SIZE}px"></canvas>
	<div class="frame"></div>
</div>

<style>
	.minimap {
		position: absolute;
		z-index: 18;
		width: var(--mm-size);
		height: var(--mm-size);
		border-radius: 50%;
		overflow: hidden;
		border: 3px solid var(--wood-dark);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
		background: #2a6d86;
	}
	.minimap.bl {
		left: 16px;
		bottom: 16px;
	}
	.minimap.tr {
		right: 16px;
		top: 96px;
	}
	canvas {
		display: block;
		image-rendering: pixelated;
	}
	.frame {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.45);
		pointer-events: none;
	}
</style>
