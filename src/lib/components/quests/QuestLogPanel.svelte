<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { QUEST_LIST } from '$data/quests';
	import { getItem } from '$data/items';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	const session = getGameSession();

	$effect(() => {
		const bus = getGameBus();
		const off = bus.on('QUEST_UPDATED_UI', (p) => (revision = p.revision));
		const offInv = bus.on('INVENTORY_CHANGED', (p) => (revision = p.revision));
		return () => {
			off();
			offInv();
		};
	});

	const rows = $derived.by(() => {
		void revision;
		const state = session.state;
		if (!state) return [];
		return QUEST_LIST.map((def) => {
			const progress = state.quests.get(def.id);
			return {
				def,
				state: progress?.state ?? 'LOCKED',
				objectives: (progress?.objectives ?? []).map((o) => ({
					...o,
					description: def.objectives.find((d) => d.id === o.id)?.description ?? o.id,
					count: def.objectives.find((d) => d.id === o.id)?.count ?? 1
				}))
			};
		}).filter((r) => r.state !== 'LOCKED' && r.state !== 'AVAILABLE');
	});

	function turnIn(id: string) {
		const state = session.state;
		if (!state) return;
		const r = state.turnInQuest(id);
		if (r.ok) {
			session.notifyInventory();
			session.emitStats();
			getGameBus().emit('QUEST_UPDATED_UI', { revision: Date.now() });
			getGameBus().emit('TOAST', { text: `Misi selesai: ${r.value.name}`, kind: 'success' });
			if (r.value.final) getGameBus().emit('CHAPTER_COMPLETE', undefined);
		} else {
			getGameBus().emit('TOAST', { text: 'Belum bisa diselesaikan', kind: 'warning' });
		}
	}

	function rewardText(def: (typeof QUEST_LIST)[number]): string {
		return (def.rewards.items ?? [])
			.map((i) => `${getItem(i.id)?.name ?? i.id} ×${i.qty}`)
			.join(', ');
	}
</script>

{#if open}
	<div class="overlay" role="dialog" aria-label="Misi">
		<div class="panel">
			<header>
				<h2>Misi</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			{#if rows.length === 0}
				<p class="empty">Belum ada misi aktif. Cari penduduk pulau untuk memulai.</p>
			{/if}
			<ul class="quests">
				{#each rows as row (row.def.id)}
					<li class="quest">
						<div class="head">
							<span class="name">{row.def.name}</span>
							<span class="status" class:done={row.state === 'COMPLETED'}>{row.state}</span>
						</div>
						<p class="desc">{row.def.description}</p>
						<ul class="objectives">
							{#each row.objectives as obj (obj.id)}
								<li class:done={obj.complete}>
									{obj.complete ? '✓' : '•'}
									{obj.description}
									<span class="count">{obj.current}/{obj.count}</span>
								</li>
							{/each}
						</ul>
						{#if rewardText(row.def)}
							<p class="reward">Hadiah: {rewardText(row.def)}</p>
						{/if}
						{#if row.state === 'COMPLETABLE'}
							<button class="turnin" onclick={() => turnIn(row.def.id)}>Selesaikan</button>
						{/if}
					</li>
				{/each}
			</ul>
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
	.close {
		background: transparent;
		border: none;
		color: inherit;
		font-size: 1.2rem;
		cursor: pointer;
	}
	.empty {
		opacity: 0.7;
	}
	.quests {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.quest {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 10px 12px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.name {
		font-weight: 700;
	}
	.status {
		font-size: 0.68rem;
		opacity: 0.6;
	}
	.status.done {
		color: #68d391;
	}
	.desc {
		font-size: 0.78rem;
		opacity: 0.8;
		margin: 4px 0 6px;
	}
	.objectives {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.objectives li {
		font-size: 0.76rem;
		display: flex;
		gap: 6px;
	}
	.objectives li.done {
		opacity: 0.5;
		text-decoration: line-through;
	}
	.count {
		margin-left: auto;
		opacity: 0.7;
	}
	.reward {
		font-size: 0.72rem;
		color: #f6ad55;
		margin: 6px 0 0;
	}
	.turnin {
		margin-top: 8px;
		padding: 7px 14px;
		border-radius: 8px;
		border: 1px solid #388a69;
		background: #2f855a;
		color: #fff;
		cursor: pointer;
		font-family: inherit;
	}
</style>
