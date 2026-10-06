<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';
	import ItemIcon from '$lib/components/inventory/ItemIcon.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	let session = getGameSession();
	/** Index of the slot currently being dragged (for reorder / merge). */
	let dragFrom = $state<number | null>(null);
	/** Slot hovered/focused, drives the detail card. */
	let selected = $state<number | null>(null);

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

	const selectedSlot = $derived(selected !== null ? (slots[selected] ?? null) : null);
	const selectedDef = $derived(selectedSlot ? getItem(selectedSlot.id) : null);

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
	<div class="u-scrim" role="dialog" aria-label="Inventaris">
		<div class="panel u-panel">
			<header class="u-header">
				<h2>🎒 Inventaris</h2>
				<div class="actions">
					<button class="u-btn-soft tidy" onclick={tidy} title="Kelompokkan item">Rapikan</button>
					<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
				</div>
			</header>

			<div class="body">
				<div class="grid">
					{#each slots as slot, i (i)}
						{@const def = slot ? getItem(slot.id) : null}
						<button
							class="slot {def?.rarity ?? ''} {dragFrom === i ? 'dragging' : ''} {slot
								? 'filled'
								: ''}"
							class:selected={selected === i}
							disabled={!slot && dragFrom === null}
							draggable={!!slot}
							title={slot ? `${itemName(slot.id)} (${slot.qty})` : 'Kosong'}
							ondragstart={() => onDragStart(i)}
							ondragover={(e) => e.preventDefault()}
							ondrop={() => moveTo(i)}
							ondragend={() => (dragFrom = null)}
							onmouseenter={() => (selected = i)}
							onfocus={() => (selected = i)}
							onclick={() => (dragFrom === null ? consume(i) : moveTo(i))}
						>
							{#if slot}
								<ItemIcon id={slot.id} size={34} />
								<span class="qty">{slot.qty > 1 ? slot.qty : ''}</span>
								<span class="name">{itemName(slot.id)}</span>
								{#if slot.durability !== undefined}
									<span class="dur">{slot.durability}</span>
								{/if}
							{/if}
						</button>
					{/each}
				</div>

				<aside class="detail">
					{#if selectedDef && selectedSlot}
						<div class="detail-head">
							<ItemIcon id={selectedSlot.id} size={48} />
							<div>
								<span class="dname">{selectedDef.name}</span>
								<span class="dmeta">{selectedDef.category} · {selectedDef.rarity}</span>
							</div>
						</div>
						<p class="ddesc">{selectedDef.description}</p>
						<dl class="dstats">
							<div>
								<dt>Jumlah</dt>
								<dd>{selectedSlot.qty}/{selectedDef.stackSize}</dd>
							</div>
							<div>
								<dt>Bobot</dt>
								<dd>{selectedDef.weight}</dd>
							</div>
							<div>
								<dt>Nilai</dt>
								<dd>🪙 {selectedDef.sellValue}</dd>
							</div>
							{#if selectedSlot.durability !== undefined}
								<div>
									<dt>Daya tahan</dt>
									<dd>{selectedSlot.durability}</dd>
								</div>
							{/if}
							{#if selectedDef.effects}
								{#each Object.entries(selectedDef.effects) as [k, v] (k)}
									<div>
										<dt>{k}</dt>
										<dd class="pos">+{v}</dd>
									</div>
								{/each}
							{/if}
						</dl>
					{:else}
						<p class="empty">Pilih item untuk melihat detail.</p>
					{/if}
				</aside>
			</div>

			<p class="hint">
				Seret untuk menata/menggabungkan item. Klik makanan/obat untuk menggunakannya.
			</p>
		</div>
	</div>
{/if}

<style>
	.panel {
		width: min(760px, 100%);
		max-height: 90%;
		overflow: auto;
		padding: 18px;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.tidy {
		padding: 6px 14px;
		font-size: 0.78rem;
	}
	.close {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-size: 1rem;
		font-weight: 800;
		cursor: pointer;
	}
	.body {
		display: grid;
		grid-template-columns: 1fr 240px;
		gap: 16px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
		gap: 8px;
		align-content: start;
	}
	.slot {
		position: relative;
		aspect-ratio: 1;
		border-radius: var(--radius);
		border: 2px solid var(--border-warm);
		background: linear-gradient(180deg, rgba(20, 12, 6, 0.22), rgba(20, 12, 6, 0.4));
		color: inherit;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		padding: 4px;
		font-family: inherit;
		transition:
			transform 0.08s ease,
			border-color 0.12s ease;
	}
	.slot:disabled {
		cursor: default;
		opacity: 0.4;
	}
	.slot.filled {
		cursor: grab;
	}
	.slot.filled:hover,
	.slot.selected {
		border-color: var(--amber);
		transform: translateY(-2px);
	}
	.slot.dragging {
		opacity: 0.4;
		border-style: dashed;
	}
	.slot.uncommon {
		border-color: var(--r-uncommon);
	}
	.slot.rare {
		border-color: var(--r-rare);
	}
	.slot.special {
		border-color: var(--r-special);
	}
	.slot.quest {
		border-color: var(--r-quest);
	}
	.qty {
		position: absolute;
		top: 3px;
		right: 5px;
		font-size: 0.72rem;
		font-weight: 800;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
	}
	.dur {
		position: absolute;
		bottom: 3px;
		right: 5px;
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--amber);
	}
	.name {
		font-size: 0.6rem;
		line-height: 1.05;
		text-align: center;
		opacity: 0.92;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.detail {
		background: var(--panel-inset);
		border: 2px solid var(--border-warm);
		border-radius: var(--radius);
		padding: 14px;
	}
	.detail-head {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 10px;
	}
	.dname {
		display: block;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.05rem;
	}
	.dmeta {
		font-size: 0.72rem;
		text-transform: capitalize;
		color: var(--ink-muted);
	}
	.ddesc {
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--ink-soft);
		margin: 0 0 12px;
	}
	.dstats {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.dstats > div {
		display: flex;
		justify-content: space-between;
		font-size: 0.76rem;
	}
	.dstats dt {
		color: var(--ink-muted);
		text-transform: capitalize;
	}
	.dstats dd {
		margin: 0;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.dstats dd.pos {
		color: var(--green-light);
	}
	.empty {
		font-size: 0.8rem;
		color: var(--ink-muted);
		text-align: center;
		margin: 24px 0;
	}
	.hint {
		margin: 14px 0 0;
		font-size: 0.75rem;
		color: var(--ink-muted);
	}
	@media (max-width: 620px) {
		.body {
			grid-template-columns: 1fr;
		}
		.detail {
			order: -1;
		}
	}
</style>
