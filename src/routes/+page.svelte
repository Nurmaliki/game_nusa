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
	<div class="scene" aria-hidden="true">
		<span class="sun"></span>
		<span class="cloud c1"></span>
		<span class="cloud c2"></span>
		<span class="hill h1"></span>
		<span class="hill h2"></span>
		<span class="island"></span>
	</div>

	<div class="panel">
		<div class="crest" aria-hidden="true">🏝️</div>
		<h1>NUSANTARA<span>SURVIVAL</span></h1>
		<p class="tagline">Terdampar. Bertahan. Bangun kapal untuk kembali ke dunia luar.</p>

		<nav>
			<button class="u-btn play" onclick={newGame}>
				<span class="btn-glyph" aria-hidden="true">▶</span> Game Baru
			</button>
			<a href={resolve('/settings')}>⚙️ Pengaturan</a>
			<a href={resolve('/about')}>📖 Tentang</a>
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
		position: relative;
		overflow: hidden;
		color: var(--ink);
		font-family: var(--font-ui);
		padding: 24px;
	}
	/* A soft painted backdrop: sky, sun, rolling hills and a tiny island. */
	.scene {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, #4a9fc9 0%, #7fc0dd 42%, #a9dcc4 62%, #7fc07a 100%);
	}
	.sun {
		position: absolute;
		top: 12%;
		left: 50%;
		transform: translateX(-50%);
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: radial-gradient(circle, #fff6cf 30%, #ffd76a 70%);
		box-shadow: 0 0 80px 30px rgba(255, 214, 106, 0.55);
	}
	.cloud {
		position: absolute;
		width: 140px;
		height: 44px;
		background: rgba(255, 255, 255, 0.85);
		border-radius: 999px;
		box-shadow:
			-40px 12px 0 -6px rgba(255, 255, 255, 0.85),
			40px 14px 0 -10px rgba(255, 255, 255, 0.85);
	}
	.c1 {
		top: 14%;
		left: 12%;
		animation: drift 40s linear infinite;
	}
	.c2 {
		top: 24%;
		right: 14%;
		opacity: 0.7;
		animation: drift 55s linear infinite reverse;
	}
	@keyframes drift {
		from {
			transform: translateX(-20px);
		}
		to {
			transform: translateX(20px);
		}
	}
	.hill {
		position: absolute;
		bottom: 0;
		border-radius: 50% 50% 0 0 / 100% 100% 0 0;
	}
	.h1 {
		left: -10%;
		width: 70%;
		height: 42%;
		background: #6fb763;
	}
	.h2 {
		right: -10%;
		width: 75%;
		height: 34%;
		background: #5aa452;
	}
	.island {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 80%;
		height: 16%;
		background: linear-gradient(180deg, #d8c48a, #b8a06a);
		border-radius: 50% 50% 0 0 / 100% 100% 0 0;
	}

	.panel {
		position: relative;
		z-index: 1;
		text-align: center;
		max-width: 460px;
		width: 100%;
		padding: 32px 28px;
		border-radius: var(--radius-lg);
		background: linear-gradient(180deg, rgba(43, 63, 48, 0.94), rgba(30, 51, 40, 0.94));
		border: 3px solid var(--wood-dark);
		box-shadow:
			0 30px 70px rgba(8, 18, 12, 0.6),
			inset 0 0 0 3px rgba(247, 241, 227, 0.1);
		backdrop-filter: blur(6px);
	}
	.crest {
		font-size: 3rem;
		line-height: 1;
		margin-bottom: 8px;
		filter: drop-shadow(0 4px 6px rgba(8, 18, 12, 0.5));
	}
	h1 {
		font-family: var(--font-display);
		font-size: clamp(2rem, 8vw, 3.25rem);
		line-height: 1;
		margin: 0 0 10px;
		letter-spacing: 0.04em;
		display: flex;
		flex-direction: column;
		color: var(--ink);
		text-shadow: 0 3px 0 rgba(20, 12, 6, 0.45);
	}
	h1 span {
		color: var(--amber);
		font-size: 0.5em;
		letter-spacing: 0.4em;
		margin-top: 4px;
	}
	.tagline {
		color: var(--ink-soft);
		margin: 0 0 28px;
		line-height: 1.5;
	}
	nav {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.play {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 1.1rem;
		padding: 16px 22px;
	}
	.btn-glyph {
		font-size: 0.8rem;
	}
	nav a {
		padding: 13px 20px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		text-decoration: none;
		text-align: center;
		box-shadow: 0 4px 0 var(--wood-dark);
		transition:
			transform 0.08s ease,
			box-shadow 0.08s ease,
			filter 0.12s ease;
	}
	nav a:hover {
		filter: brightness(1.08);
	}
	nav a:active {
		transform: translateY(3px);
		box-shadow: 0 1px 0 var(--wood-dark);
	}
	footer {
		margin-top: 26px;
		font-size: 0.75rem;
		color: var(--ink-muted);
	}
</style>
