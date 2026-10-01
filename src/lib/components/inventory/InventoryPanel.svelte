<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	let session = getGameSession();
	/** Index of the slot currently being dragged (for reorder / merge). */
	let dragFrom = $state<number | null>(null);

	$effect(() => {
		const off = getGameBus().on('INVENTORY_CHANGED', (p) => (revision = p.revision));
		return off;
	});

	const slots = $derived.by(() => {
		void revision;
		const state = session.state;
		if (!state) return [];
		return state.inventory.toArray();
	});

	function itemName(id: string): string {
		return getItem(id)?.name ?? id;
	}

	function consume(index: number) {
		const state = session.state;
		if (!state) return;
		const slot = state.inventory.get(index);
		if (!slot) return;
		const def = getItem(slot.id);
		if (!def) return;
		const r = state.consume(slot.id);
		if (r.ok) {
			session.notifyInventory();
			session.emitStats();
			getGameBus().emit('TOAST', { text: `Mengonsumsi ${def.name}`, kind: 'info' });
		}
	}

	/** Tidy the bag: group by category, then rarity/name (QoL). */
	function tidy() {
		const state = session.state;
		if (!state) return;
		state.inventory.sort(getItem);
		session.notifyInventory();
		getGameBus().emit('SFX', { id: 'ui_confirm' });
	}

	/** Move/merge a stack from one slot to another (drag & drop). */
	function moveTo(to: number) {
		const from = dragFrom;
		dragFrom = null;
		const state = session.state;
		if (!state || from === null || from === to) return;
		const src = state.inventory.get(from);
		if (!src) return;
		const def = getItem(src.id);
		if (!def) return;
		const r = state.inventory.move(from, to, def);
		if (r.ok) {
			session.notifyInventory();
			getGameBus().emit('SFX', { id: 'ui_click' });
		}
	}

	function onDragStart(index: number) {
		dragFrom = index;
	}
</script>

{#if open}
	<div class="overlay" role="dialog" aria-label="Inventaris">
		<div class="panel">
			<header>
				<h2>Inventaris</h2>
				<div class="actions">
					<button class="tidy" onclick={tidy} title="Kelompokkan item">Rapikan</button>
					<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
				</div>
			</header>
			<div class="grid">
				{#each slots as slot, i (i)}
					{@const def = slot ? getItem(slot.id) : null}
					<button
						class="slot {def?.rarity ?? ''} {dragFrom === i ? 'dragging' : ''} {slot
							? 'filled'
							: ''}"
						disabled={!slot && dragFrom === null}
						draggable={!!slot}
						title={slot ? `${itemName(slot.id)} (${slot.qty})` : 'Kosong'}
						ondragstart={() => onDragStart(i)}
						ondragover={(e) => e.preventDefault()}
						ondrop={() => moveTo(i)}
						ondragend={() => (dragFrom = null)}
						onclick={() => (dragFrom === null ? consume(i) : moveTo(i))}
					>
						{#if slot}
							<span class="icon" aria-hidden="true"></span>
							<span class="qty">{slot.qty > 1 ? slot.qty : ''}</span>
							<span class="name">{itemName(slot.id)}</span>
							{#if slot.durability !== undefined}
								<span class="dur">{slot.durability}</span>
							{/if}
						{/if}
					</button>
				{/each}
			</div>
			<p class="hint">
				Seret untuk menata/menggabungkan item. Klik makanan/obat untuk menggunakannya.
			</p>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: grid;
		place-items: center;
		z-index: 50;
		padding: 16px;
	}
	.panel {
		background: #141c2e;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 14px;
		padding: 16px;
		width: min(560px, 100%);
		max-height: 90%;
		overflow: auto;
		color: #f7fafc;
		font-family: var(--font-ui);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.tidy {
		background: rgba(56, 178, 172, 0.18);
		border: 1px solid rgba(56, 178, 172, 0.5);
		color: #81e6d9;
		border-radius: 8px;
		padding: 4px 10px;
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
	}
	.tidy:hover {
		background: rgba(56, 178, 172, 0.3);
	}
	.close {
		background: transparent;
		border: none;
		color: inherit;
		font-size: 1.2rem;
		cursor: pointer;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: 8px;
	}
	.slot {
		position: relative;
		aspect-ratio: 1;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: inherit;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 4px;
		font-family: inherit;
	}
	.slot:disabled {
		cursor: default;
		opacity: 0.5;
	}
	.slot.filled {
		cursor: grab;
	}
	.slot.dragging {
		opacity: 0.4;
		border-style: dashed;
	}
	.slot.uncommon {
		border-color: #38a169;
	}
	.slot.rare {
		border-color: #3182ce;
	}
	.slot.special {
		border-color: #805ad5;
	}
	.slot.quest {
		border-color: #d69e2e;
	}
	.icon {
		width: 22px;
		height: 22px;
		border-radius: 4px;
		background: #38a169;
	}
	.qty {
		position: absolute;
		top: 2px;
		right: 4px;
		font-size: 0.7rem;
		font-weight: 700;
	}
	.dur {
		position: absolute;
		bottom: 2px;
		right: 4px;
		font-size: 0.65rem;
		color: #f6ad55;
	}
	.name {
		font-size: 0.62rem;
		line-height: 1.1;
		text-align: center;
		opacity: 0.9;
	}
	.hint {
		margin: 12px 0 0;
		font-size: 0.75rem;
		opacity: 0.65;
	}
</style>
