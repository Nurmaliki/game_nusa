<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';

	let dead = $state(false);

	$effect(() => {
		const bus = getGameBus();
		const offDied = bus.on('PLAYER_DIED', () => {
			dead = true;
		});
		const offRespawn = bus.on('PLAYER_RESPAWNED', () => {
			dead = false;
		});
		return () => {
			offDied();
			offRespawn();
		};
	});
</script>

{#if dead}
	<div class="death" role="alert">
		<div class="card u-panel">
			<h2>Tumbang…</h2>
			<p>Sebagian barang tertinggal dalam tas. Kembali ke lokasi untuk mengambilnya.</p>
		</div>
	</div>
{/if}

<style>
	.death {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: radial-gradient(circle, rgba(150, 20, 20, 0.4), rgba(4, 8, 6, 0.85));
		z-index: 55;
		text-align: center;
		font-family: var(--font-ui);
		pointer-events: none;
		padding: 24px;
	}
	.card {
		padding: 26px 30px;
		max-width: 380px;
	}
	h2 {
		margin: 0 0 10px;
		font-family: var(--font-display);
		font-size: 2.2rem;
		letter-spacing: 0.06em;
		color: var(--clay);
		text-shadow: 0 3px 0 rgba(20, 12, 6, 0.5);
	}
	p {
		color: var(--ink-soft);
		margin: 0;
		line-height: 1.5;
	}
</style>
