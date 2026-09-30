<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';

	let visible = $state(false);

	$effect(() => {
		const bus = getGameBus();
		const off = bus.on('CHAPTER_COMPLETE', () => {
			visible = true;
		});
		return off;
	});
</script>

{#if visible}
	<div class="ending" role="alertdialog" aria-label="Bab I Selesai">
		<div class="card">
			<h1>BAB I SELESAI</h1>
			<p>
				Kapal layarmu siap. Kau meninggalkan pulau dengan cerita yang akan dikenang — namun
				perjalananmu baru saja dimulai.
			</p>
			<button onclick={() => (visible = false)}>Lanjutkan menjelajah</button>
		</div>
	</div>
{/if}

<style>
	.ending {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: linear-gradient(180deg, rgba(4, 10, 24, 0.9), rgba(4, 10, 24, 0.96));
		z-index: 70;
		padding: 24px;
	}
	.card {
		text-align: center;
		color: #f7fafc;
		font-family: var(--font-ui);
		max-width: 460px;
	}
	h1 {
		letter-spacing: 0.18em;
		font-size: 1.8rem;
		margin-bottom: 12px;
		color: #68d391;
	}
	p {
		line-height: 1.6;
		opacity: 0.9;
	}
	button {
		margin-top: 16px;
		padding: 10px 20px;
		border-radius: 10px;
		border: 1px solid #388a69;
		background: #2f855a;
		color: #fff;
		cursor: pointer;
		font-family: inherit;
		font-size: 1rem;
	}
</style>
