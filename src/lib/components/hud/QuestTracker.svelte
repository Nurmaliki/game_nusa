<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getQuest } from '$data/quests';

	let revision = $state(0);
	const session = getGameSession();

	$effect(() => {
		const bus = getGameBus();
		const off = bus.on('QUEST_UPDATED_UI', (p) => (revision = p.revision));
		const offInv = bus.on('INVENTORY_CHANGED', (p) => (revision = p.revision));
		const timer = setInterval(() => (revision += 1), 1500);
		return () => {
			off();
			offInv();
			clearInterval(timer);
		};
	});

	const tracked = $derived.by(() => {
		void revision;
		const state = session.state;
		if (!state) return [];
		return state.activeQuests().map((p) => {
			const def = getQuest(p.id);
			return {
				id: p.id,
				name: def?.name ?? p.id,
				objectives: p.objectives.map((o) => ({
					id: o.id,
					description: def?.objectives.find((d) => d.id === o.id)?.description ?? o.id,
					current: o.current,
					count: def?.objectives.find((d) => d.id === o.id)?.count ?? 1,
					complete: o.complete
				}))
			};
		});
	});
</script>

{#if tracked.length > 0}
	<div class="tracker" aria-label="Misi aktif">
		{#each tracked as quest (quest.id)}
			<div class="quest">
				<div class="qname">{quest.name}</div>
				<ul>
					{#each quest.objectives as obj (obj.id)}
						<li class:done={obj.complete}>
							<span class="check">{obj.complete ? '✓' : '•'}</span>
							<span>{obj.description}</span>
							<span class="count">{obj.current}/{obj.count}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
{/if}

<style>
	.tracker {
		position: absolute;
		top: 116px;
		left: 12px;
		width: 250px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: none;
		font-family: var(--font-ui);
		color: var(--ink);
	}
	.quest {
		background: linear-gradient(180deg, rgba(56, 81, 62, 0.9), rgba(43, 63, 48, 0.9));
		border: 2px solid var(--wood-dark);
		border-left: 5px solid var(--amber);
		border-radius: var(--radius);
		padding: 9px 12px;
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
		backdrop-filter: blur(4px);
	}
	.qname {
		font-family: var(--font-display);
		font-size: 0.86rem;
		font-weight: 800;
		margin-bottom: 5px;
		color: var(--amber);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	li {
		display: flex;
		gap: 6px;
		font-size: 0.72rem;
		align-items: baseline;
	}
	li.done {
		opacity: 0.5;
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
</style>
