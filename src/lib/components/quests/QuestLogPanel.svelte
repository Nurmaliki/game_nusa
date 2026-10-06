<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { QUEST_LIST, getQuest } from '$data/quests';
	import ItemIcon from '$lib/components/inventory/ItemIcon.svelte';

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
			if (r.value.final) {
				const chapter = getQuest(id)?.chapter ?? 1;
				getGameBus().emit('CHAPTER_COMPLETE', {
					chapter,
					title: chapter === 2 ? 'Pusaka Kawah' : 'Kapal Layar'
				});
			}
		} else {
			getGameBus().emit('TOAST', { text: 'Belum bisa diselesaikan', kind: 'warning' });
		}
	}

	function rewards(def: (typeof QUEST_LIST)[number]): { id: string; qty: number }[] {
		return def.rewards.items ?? [];
	}

	const STATUS_LABEL: Record<string, string> = {
		ACTIVE: 'Berjalan',
		COMPLETABLE: 'Siap diserahkan',
		COMPLETED: 'Selesai'
	};
</script>

{#if open}
	<div class="u-scrim" role="dialog" aria-label="Misi">
		<div class="panel u-panel">
			<header class="u-header">
				<h2>📜 Misi</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			{#if rows.length === 0}
				<p class="empty">Belum ada misi aktif. Cari penduduk pulau untuk memulai.</p>
			{/if}
			<ul class="quests">
				{#each rows as row (row.def.id)}
					<li class="quest" class:done={row.state === 'COMPLETED'}>
						<div class="head">
							<span class="name">{row.def.name}</span>
							<span class="status s-{row.state}">{STATUS_LABEL[row.state] ?? row.state}</span>
						</div>
						<p class="desc">{row.def.description}</p>
						<ul class="objectives">
							{#each row.objectives as obj (obj.id)}
								<li class:done={obj.complete}>
									<span class="check">{obj.complete ? '✓' : '○'}</span>
									<span>{obj.description}</span>
									<span class="count">{obj.current}/{obj.count}</span>
								</li>
							{/each}
						</ul>
						{#if rewards(row.def).length}
							<div class="reward">
								<span class="rlabel">Hadiah</span>
								{#each rewards(row.def) as r (r.id)}
									<span class="ritem"><ItemIcon id={r.id} size={22} /> ×{r.qty}</span>
								{/each}
							</div>
						{/if}
						{#if row.state === 'COMPLETABLE'}
							<button class="u-btn turnin" onclick={() => turnIn(row.def.id)}>
								Selesaikan Misi
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.panel {
		width: min(600px, 100%);
		max-height: 90%;
		overflow: auto;
		padding: 18px;
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
	.empty {
		color: var(--ink-muted);
	}
	.quests {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.quest {
		background: linear-gradient(180deg, rgba(247, 241, 227, 0.05), rgba(20, 12, 6, 0.2));
		border: 2px solid var(--border-warm);
		border-left: 5px solid var(--amber);
		border-radius: var(--radius);
		padding: 12px 14px;
	}
	.quest.done {
		border-left-color: var(--green);
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.name {
		font-family: var(--font-display);
		font-weight: 800;
	}
	.status {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 2px 10px;
		border-radius: var(--radius-pill);
		background: rgba(20, 12, 6, 0.4);
		color: var(--ink-soft);
	}
	.status.s-COMPLETABLE {
		color: var(--amber);
	}
	.status.s-COMPLETED {
		color: var(--green-light);
	}
	.desc {
		font-size: 0.8rem;
		color: var(--ink-soft);
		margin: 6px 0 8px;
		line-height: 1.5;
	}
	.objectives {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.objectives li {
		font-size: 0.78rem;
		display: flex;
		gap: 8px;
		align-items: baseline;
	}
	.objectives li.done {
		opacity: 0.55;
		text-decoration: line-through;
	}
	.check {
		color: var(--green-light);
		font-weight: 800;
	}
	.count {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
		color: var(--ink-muted);
	}
	.reward {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}
	.rlabel {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-muted);
	}
	.ritem {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.75rem;
		font-weight: 700;
	}
	.turnin {
		margin-top: 12px;
		padding: 9px 18px;
		font-size: 0.85rem;
	}
</style>
