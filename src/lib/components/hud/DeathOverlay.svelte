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
		<h2>Tumbang…</h2>
		<p>Sebagian barang tertinggal dalam tas. Kembali ke lokasi untuk mengambilnya.</p>
	</div>
{/if}

<style>
	.death {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 8px;
		background: radial-gradient(circle, rgba(120, 10, 10, 0.35), rgba(0, 0, 0, 0.75));
		color: #f7fafc;
		z-index: 55;
		text-align: center;
		font-family: var(--font-ui);
		pointer-events: none;
	}
	h2 {
		margin: 0;
		font-size: 2rem;
		letter-spacing: 0.08em;
	}
	p {
		opacity: 0.85;
		max-width: 320px;
	}
</style>
