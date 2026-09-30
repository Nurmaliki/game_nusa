<script lang="ts">
	import { deviceStore } from '$stores/device.svelte';

	/**
	 * Shown on small touch devices held in portrait: asks the player to rotate
	 * the device for the intended landscape experience (§44).
	 */
	let visible = $derived(deviceStore.isTouch && deviceStore.isSmall && !deviceStore.isLandscape);
</script>

{#if visible}
	<div class="rotate" role="alertdialog" aria-label="Putar perangkat">
		<div class="card">
			<div class="icon" aria-hidden="true">📱↻</div>
			<h2>Putar Perangkat</h2>
			<p>Nusantara Survival paling nyaman dimainkan dalam mode lanskap.</p>
		</div>
	</div>
{/if}

<style>
	.rotate {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: #0b1220;
		z-index: 200;
		padding: 24px;
		text-align: center;
		color: #f7fafc;
		font-family: var(--font-ui);
	}
	.icon {
		font-size: 3rem;
		margin-bottom: 12px;
	}
	h2 {
		margin: 0 0 8px;
	}
	p {
		opacity: 0.8;
		max-width: 320px;
	}
</style>
