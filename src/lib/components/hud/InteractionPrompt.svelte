<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';

	let text = $state<string | null>(null);

	$effect(() => {
		const off = getGameBus().on('INTERACTION_PROMPT', (p) => (text = p.text));
		return off;
	});
</script>

{#if text}
	<div class="prompt">
		<span class="key" aria-hidden="true">E</span>
		<span>{text}</span>
	</div>
{/if}

<style>
	.prompt {
		position: absolute;
		bottom: 104px;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(180deg, var(--panel-raised), var(--panel));
		border: 2px solid var(--wood-dark);
		color: var(--ink);
		padding: 8px 16px 8px 8px;
		border-radius: var(--radius-pill);
		font-family: var(--font-ui);
		font-size: 0.9rem;
		font-weight: 600;
		z-index: 25;
		pointer-events: none;
		display: flex;
		align-items: center;
		gap: 10px;
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
		animation: pop 0.16s ease;
	}
	@keyframes pop {
		from {
			transform: translate(-50%, 8px);
			opacity: 0;
		}
	}
	.key {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: linear-gradient(180deg, var(--green-light), var(--green));
		color: #16241d;
		font-weight: 800;
		font-size: 0.8rem;
		box-shadow: 0 2px 0 var(--green-dark);
	}
</style>
