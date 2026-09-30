<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { GAME_VERSION } from '$game/config/version';
	import { getGameSession } from '$stores/game-session.svelte';
	import * as repo from '$game/save/repository';
	import SaveSlotManager from '$lib/components/menu/SaveSlotManager.svelte';
	import type { SaveSlotMeta } from '$types/save';

	let slots = $state<SaveSlotMeta[]>([]);
	let loading = $state(true);
	const session = getGameSession();

	async function refresh(): Promise<void> {
		if (repo.isStorageAvailable()) {
			slots = await session.listSlots();
		}
	}

	onMount(async () => {
		await refresh();
		loading = false;
	});

	function newGame() {
		session.newGame();
		goto(resolve('/play'));
	}
</script>

<svelte:head><title>Nusantara Survival</title></svelte:head>

<main>
	<div class="panel">
		<h1>NUSANTARA<span>SURVIVAL</span></h1>
		<p class="tagline">Terdampar. Bertahan. Bangun kapal untuk kembali ke dunia luar.</p>

		<nav>
			<button class="primary" onclick={newGame}>Game Baru</button>
			<a href={resolve('/settings')}>Pengaturan</a>
			<a href={resolve('/about')}>Tentang</a>
		</nav>

		{#if !loading && repo.isStorageAvailable()}
			<SaveSlotManager {slots} onChanged={refresh} />
		{/if}

		<footer>v{GAME_VERSION} · single-player · offline-ready</footer>
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
		text-align: center;
		max-width: 440px;
		width: 100%;
	}
	h1 {
		font-size: clamp(2rem, 8vw, 3.25rem);
		line-height: 1;
		margin: 0 0 8px;
		letter-spacing: 0.06em;
		display: flex;
		flex-direction: column;
	}
	h1 span {
		color: #68d391;
		font-size: 0.55em;
		letter-spacing: 0.42em;
	}
	.tagline {
		opacity: 0.8;
		margin: 0 0 32px;
	}
	nav {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	button,
	a {
		padding: 14px 20px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font-size: 1rem;
		cursor: pointer;
		text-decoration: none;
		text-align: center;
	}
	button.primary {
		background: #38a169;
		border-color: #38a169;
		font-weight: 700;
	}
	button.primary:hover {
		background: #2f855a;
	}
	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	footer {
		margin-top: 28px;
		font-size: 0.75rem;
		opacity: 0.6;
	}
</style>
