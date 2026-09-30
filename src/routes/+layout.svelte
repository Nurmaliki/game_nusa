<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { settingsStore } from '$stores/settings.svelte';
	import { swStore } from '$lib/pwa/sw-store.svelte';
	import OfflineIndicator from '$lib/components/pwa/OfflineIndicator.svelte';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		settingsStore.init();
		// Register the service worker once for the whole app.
		void swStore.init();
		// Mark the document as interactive. Until this runs, SSR markup is visible
		// but event handlers are not attached; tests (and progressive-enhancement
		// checks) can rely on this attribute instead of racing hydration.
		document.documentElement.dataset.hydrated = 'true';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="description" content="Nusantara Survival — survival adventure kepulauan tropis." />
</svelte:head>

{@render children()}
<OfflineIndicator />
