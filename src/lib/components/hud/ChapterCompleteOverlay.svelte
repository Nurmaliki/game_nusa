<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';

	let visible = $state(false);
	let chapter = $state(1);
	let title = $state('Kapal Layar');

	const roman = (n: number) => ['I', 'II', 'III', 'IV'][n - 1] ?? String(n);
	// Closing line per chapter — Chapter II is the true ending of the arc.
	const body = $derived(
		chapter >= 2
			? 'Pusaka kawah menenangkan roh gunung. Perjalananmu melintasi dua pulau pun usai — namun lautan masih menyimpan banyak rahasia.'
			: 'Kapal layarmu siap. Kau meninggalkan pulau dengan cerita yang akan dikenang — namun perjalananmu baru saja dimulai.'
	);

	$effect(() => {
		const bus = getGameBus();
		const off = bus.on('CHAPTER_COMPLETE', (p) => {
			chapter = p.chapter;
			title = p.title;
			visible = true;
		});
		return off;
	});
</script>

{#if visible}
	<div class="ending" role="alertdialog" aria-label="Bab {roman(chapter)} Selesai">
		<div class="card">
			<h1>BAB {roman(chapter)} SELESAI</h1>
			<p class="subtitle">{title}</p>
			<p>{body}</p>
			<button onclick={() => (visible = false)}>
				{chapter >= 2 ? 'Terus menjelajah' : 'Lanjutkan menjelajah'}
			</button>
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
	.subtitle {
		margin: 0 0 10px;
		font-size: 0.95rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #f6c453;
		opacity: 0.95;
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
