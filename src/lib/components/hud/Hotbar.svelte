<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';
	import ItemIcon from '$lib/components/inventory/ItemIcon.svelte';

	let revision = $state(0);
	let activeSlot = $state(0);
	const session = getGameSession();

	$effect(() => {
		const bus = getGameBus();
		const offInv = bus.on('INVENTORY_CHANGED', (p) => (revision = p.revision));
		const offHotbar = bus.on('HOTBAR_CHANGED', (p) => (activeSlot = p.activeSlot));
		return () => {
			offInv();
			offHotbar();
		};
	});

	const slots = $derived.by(() => {
		void revision;
		const state = session.state;
		if (!state) return [];
		const all = state.inventory.toArray();
		return all.slice(0, state.inventory.hotbarSize);
	});

	function select(i: number) {
		const state = session.state;
		if (!state) return;
		state.equipment.select(i);
		activeSlot = i;
		getGameBus().emit('HOTBAR_CHANGED', { activeSlot: i });
		getGameBus().emit('SFX', { id: 'ui_click' });
	}
</script>

<div class="hotbar" role="toolbar" aria-label="Hotbar">
	{#each slots as slot, i (i)}
		<button
			class="slot"
			class:active={i === activeSlot}
			class:filled={!!slot}
			aria-pressed={i === activeSlot}
			title={slot ? `${getItem(slot.id)?.name ?? slot.id} (${slot.qty})` : `Slot ${i + 1}`}
			onclick={() => select(i)}
		>
			<span class="key">{i + 1}</span>
			{#if slot}
				<ItemIcon id={slot.id} size={38} />
				<span class="name">{getItem(slot.id)?.name ?? slot.id}</span>
				{#if slot.qty > 1}<span class="qty">{slot.qty}</span>{/if}
				{#if slot.durability !== undefined}
					<span class="dur">{slot.durability}</span>
				{/if}
			{/if}
		</button>
	{/each}
</div>

<style>
	.hotbar {
		position: absolute;
		bottom: max(14px, env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 8px;
		z-index: 20;
		padding: 8px 10px;
		border-radius: var(--radius-lg);
		background: linear-gradient(180deg, var(--panel-raised), var(--panel));
		border: 2px solid var(--wood-dark);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
	}
	.slot {
		position: relative;
		width: 62px;
		height: 66px;
		border-radius: var(--radius);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, rgba(20, 12, 6, 0.25), rgba(20, 12, 6, 0.45));
		color: var(--ink);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		font-family: var(--font-ui);
		padding: 3px;
		transition:
			transform 0.08s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}
	.slot.filled:hover {
		transform: translateY(-2px);
		border-color: var(--border-strong);
	}
	.slot.active {
		border-color: var(--amber);
		background: linear-gradient(180deg, rgba(240, 178, 60, 0.24), rgba(20, 12, 6, 0.4));
		box-shadow:
			0 0 0 3px rgba(240, 178, 60, 0.35),
			var(--shadow-inset);
		transform: translateY(-3px);
	}
	.key {
		position: absolute;
		top: 2px;
		left: 5px;
		font-size: 0.62rem;
		font-weight: 800;
		color: var(--ink-muted);
	}
	.name {
		font-size: 0.56rem;
		line-height: 1;
		text-align: center;
		opacity: 0.92;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.qty {
		position: absolute;
		top: 2px;
		right: 4px;
		font-size: 0.66rem;
		font-weight: 800;
		color: var(--ink);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
	}
	.dur {
		position: absolute;
		bottom: 2px;
		right: 4px;
		font-size: 0.56rem;
		font-weight: 700;
		color: var(--amber);
	}
	@media (max-width: 560px) {
		.slot {
			width: 52px;
			height: 58px;
		}
		.hotbar {
			gap: 5px;
			padding: 6px 7px;
		}
	}
</style>
