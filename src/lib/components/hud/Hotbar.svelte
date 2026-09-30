<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';

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
	}
</script>

<div class="hotbar" role="toolbar" aria-label="Hotbar">
	{#each slots as slot, i (i)}
		<button
			class="slot"
			class:active={i === activeSlot}
			aria-pressed={i === activeSlot}
			title={slot ? `${getItem(slot.id)?.name ?? slot.id} (${slot.qty})` : `Slot ${i + 1}`}
			onclick={() => select(i)}
		>
			<span class="key">{i + 1}</span>
			{#if slot}
				<span class="icon"></span>
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
		bottom: 14px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 6px;
		z-index: 20;
	}
	.slot {
		position: relative;
		width: 62px;
		height: 62px;
		border-radius: 10px;
		border: 2px solid rgba(255, 255, 255, 0.18);
		background: rgba(11, 18, 32, 0.75);
		color: #f7fafc;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		font-family: var(--font-ui);
		padding: 2px;
	}
	.slot.active {
		border-color: #68d391;
		box-shadow: 0 0 0 2px rgba(104, 211, 145, 0.4);
	}
	.key {
		position: absolute;
		top: 1px;
		left: 4px;
		font-size: 0.6rem;
		opacity: 0.6;
	}
	.icon {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		background: #38a169;
	}
	.name {
		font-size: 0.55rem;
		line-height: 1;
		text-align: center;
		opacity: 0.9;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.qty {
		position: absolute;
		top: 1px;
		right: 4px;
		font-size: 0.62rem;
		font-weight: 700;
	}
	.dur {
		position: absolute;
		bottom: 1px;
		right: 4px;
		font-size: 0.58rem;
		color: #f6ad55;
	}
</style>
