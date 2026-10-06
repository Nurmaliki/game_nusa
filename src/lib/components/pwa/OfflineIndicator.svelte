<script lang="ts">
	import { browser } from '$app/environment';
	import { swStore } from '$lib/pwa/sw-store.svelte';
	import { statusLabel } from '$lib/pwa/sw-helpers';

	/**
	 * Global PWA status (Phase 12). Shows a small offline/update pill and a
	 * connection banner. Non-blocking and respects reduced motion via CSS only.
	 */
	let online = $state(browser ? navigator.onLine : true);

	const label = $derived(statusLabel(swStore.state));
	const showPill = $derived(
		swStore.state.updateAvailable ||
			swStore.state.offlineReady ||
			swStore.state.status === 'error' ||
			swStore.state.status === 'registering'
	);

	function goOnline(): void {
		online = true;
	}
	function goOffline(): void {
		online = false;
	}

	$effect(() => {
		if (!browser) return;
		window.addEventListener('online', goOnline);
		window.addEventListener('offline', goOffline);
		return () => {
			window.removeEventListener('online', goOnline);
			window.removeEventListener('offline', goOffline);
		};
	});
</script>

{#if !online}
	<div class="banner" role="status">Mode offline — progres tetap tersimpan di perangkat.</div>
{/if}

{#if showPill}
	<div class="pill" class:ok={label.tone === 'ok'} class:warn={label.tone === 'warn'} role="status">
		<span class="dot" aria-hidden="true"></span>
		<span>{label.text}</span>
		{#if swStore.state.updateAvailable}
			<button onclick={() => swStore.applyUpdate()}>Muat ulang</button>
		{/if}
	</div>
{/if}

<style>
	.banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 90;
		padding: 7px 12px;
		text-align: center;
		font-size: 0.8rem;
		font-weight: 700;
		background: linear-gradient(180deg, var(--amber), var(--amber-dark));
		color: #2a1c05;
		font-family: var(--font-ui);
	}
	.pill {
		position: fixed;
		bottom: calc(10px + env(safe-area-inset-bottom, 0px));
		right: 10px;
		z-index: 80;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: var(--radius-pill);
		font-size: 0.72rem;
		font-weight: 600;
		font-family: var(--font-ui);
		background: linear-gradient(180deg, rgba(56, 81, 62, 0.9), rgba(43, 63, 48, 0.9));
		color: var(--ink);
		border: 2px solid var(--wood-dark);
		box-shadow: var(--shadow-soft);
		backdrop-filter: blur(6px);
	}
	.pill.ok .dot {
		background: var(--green-light);
	}
	.pill.warn .dot {
		background: var(--amber);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--ink-muted);
	}
	.pill button {
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		border: none;
		background: var(--green);
		color: #16241d;
		font-weight: 800;
		font-size: 0.7rem;
		cursor: pointer;
	}
</style>
