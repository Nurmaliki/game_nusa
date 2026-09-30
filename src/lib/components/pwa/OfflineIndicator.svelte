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
		padding: 6px 12px;
		text-align: center;
		font-size: 0.8rem;
		background: #744210;
		color: #fefcbf;
		font-family: system-ui, sans-serif;
	}
	.pill {
		position: fixed;
		bottom: calc(10px + env(safe-area-inset-bottom, 0px));
		right: 10px;
		z-index: 80;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 999px;
		font-size: 0.72rem;
		font-family: system-ui, sans-serif;
		background: rgba(11, 18, 32, 0.82);
		color: #e2e8f0;
		border: 1px solid rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(6px);
	}
	.pill.ok .dot {
		background: #68d391;
	}
	.pill.warn .dot {
		background: #f6ad55;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #a0aec0;
	}
	.pill button {
		padding: 2px 8px;
		border-radius: 999px;
		border: none;
		background: #38a169;
		color: white;
		font-size: 0.7rem;
		cursor: pointer;
	}
</style>
