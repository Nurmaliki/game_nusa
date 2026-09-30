<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { settingsStore } from '$stores/settings.svelte';

	let flash = $state(0);
	let reducedMotion = false;

	$effect(() => {
		const bus = getGameBus();
		const off = bus.on('PLAYER_DAMAGED', () => {
			if (reducedMotion || !settingsStore.damageFlash) return;
			flash = 1;
			setTimeout(() => (flash = 0), 180);
		});
		const mq =
			typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
		if (mq) {
			reducedMotion = mq.matches;
			const handler = () => (reducedMotion = mq.matches);
			mq.addEventListener('change', handler);
			return () => {
				off();
				mq.removeEventListener('change', handler);
			};
		}
		return off;
	});
</script>

{#if flash > 0}
	<div class="flash" aria-hidden="true"></div>
{/if}

<style>
	.flash {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 45;
		background: radial-gradient(circle, rgba(200, 0, 0, 0), rgba(200, 0, 0, 0.45));
		animation: fade 180ms ease-out;
	}
	@keyframes fade {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
</style>
