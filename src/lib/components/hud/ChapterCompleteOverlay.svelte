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
			<button class="u-btn" onclick={() => (visible = false)}>
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
		background: radial-gradient(circle at 50% 35%, rgba(30, 51, 40, 0.94), rgba(4, 10, 8, 0.97));
		z-index: 70;
		padding: 24px;
	}
	.card {
		text-align: center;
		color: var(--ink);
		font-family: var(--font-ui);
		max-width: 480px;
	}
	h1 {
		font-family: var(--font-display);
		letter-spacing: 0.16em;
		font-size: 2rem;
		margin: 0 0 14px;
		color: var(--green-light);
		text-shadow: 0 3px 0 rgba(20, 12, 6, 0.5);
	}
	.subtitle {
		margin: 0 0 12px;
		font-size: 0.95rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--amber);
		font-weight: 700;
	}
	p {
		line-height: 1.65;
		color: var(--ink-soft);
		margin: 0;
	}
</style>
