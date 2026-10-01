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
		background: radial-gradient(circle at 50% 30%, #10331f, #0b1220 70%);
		color: #f7fafc;
		font-family: system-ui, sans-serif;
		padding: 24px;
	}
	.panel {
		max-width: 420px;
		width: 100%;
	}
	h1 {
		margin-top: 0;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 16px;
	}
	dt {
		opacity: 0.7;
	}
	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.note {
		opacity: 0.75;
		line-height: 1.5;
		margin: 20px 0;
	}
	a {
		display: inline-block;
		padding: 10px 18px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.08);
		color: inherit;
		text-decoration: none;
	}
</style>
