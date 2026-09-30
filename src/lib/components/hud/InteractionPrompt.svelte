<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';

	let text = $state<string | null>(null);

	$effect(() => {
		const off = getGameBus().on('INTERACTION_PROMPT', (p) => (text = p.text));
		return off;
	});
</script>

{#if text}
	<div class="prompt">{text}</div>
{/if}

<style>
	.prompt {
		position: absolute;
		bottom: 96px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(11, 18, 32, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #f7fafc;
		padding: 8px 16px;
		border-radius: 10px;
		font-family: var(--font-ui);
		font-size: 0.9rem;
		z-index: 25;
		pointer-events: none;
	}
</style>
