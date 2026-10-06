<script lang="ts">
	import { resolve } from '$app/paths';
	import { GAME_VERSION, BUILD_ID, CURRENT_SCHEMA_VERSION } from '$game/config/version';
	import { swStore } from '$lib/pwa/sw-store.svelte';
	import { statusLabel } from '$lib/pwa/sw-helpers';
</script>

<svelte:head><title>Tentang — Nusantara Survival</title></svelte:head>

<main>
	<div class="panel">
		<h1>Tentang</h1>
		<dl>
			<dt>Game</dt>
			<dd>Nusantara Survival</dd>
			<dt>Pembuat</dt>
			<dd>Nur Maliki</dd>
			<dt>Versi</dt>
			<dd>{GAME_VERSION}</dd>
			<dt>Build</dt>
			<dd>{BUILD_ID}</dd>
			<dt>Save Schema</dt>
			<dd>v{CURRENT_SCHEMA_VERSION}</dd>
			<dt>Platform</dt>
			<dd>Web (desktop & mobile)</dd>
		</dl>
		<p class="note">
			Permainan single-player yang berjalan sepenuhnya di perangkat Anda. Progres disimpan secara
			lokal (IndexedDB).
		</p>
		<p class="note">
			Tersedia sebagai aplikasi (PWA): buka menu peramban lalu pilih <strong>Instal</strong> atau
			<strong>Tambahkan ke Layar Utama</strong> untuk bermain offline.
		</p>
		<dl>
			<dt>Status</dt>
			<dd>{statusLabel(swStore.state).text}</dd>
		</dl>
		<a href={resolve('/')}>Kembali</a>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		color: var(--ink);
		font-family: var(--font-ui);
		padding: 24px;
	}
	.panel {
		max-width: 480px;
		width: 100%;
		padding: 26px 28px;
		border-radius: var(--radius-lg);
		background: linear-gradient(180deg, rgba(43, 63, 48, 0.96), rgba(30, 51, 40, 0.96));
		border: 3px solid var(--wood-dark);
		box-shadow:
			var(--shadow-panel),
			inset 0 0 0 3px rgba(247, 241, 227, 0.1);
	}
	h1 {
		margin-top: 0;
		font-family: var(--font-display);
		text-shadow: 0 3px 0 rgba(20, 12, 6, 0.4);
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px 16px;
	}
	dt {
		color: var(--ink-muted);
		font-weight: 600;
	}
	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.note {
		color: var(--ink-soft);
		line-height: 1.55;
		margin: 20px 0;
	}
	a {
		display: inline-block;
		margin-top: 8px;
		padding: 11px 22px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 4px 0 var(--wood-dark);
		transition:
			transform 0.08s ease,
			box-shadow 0.08s ease;
	}
	a:hover {
		filter: brightness(1.08);
	}
	a:active {
		transform: translateY(3px);
		box-shadow: 0 1px 0 var(--wood-dark);
	}
</style>
