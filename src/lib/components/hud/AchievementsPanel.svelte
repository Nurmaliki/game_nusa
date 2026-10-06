<script lang="ts">
	import { getGameSession } from '$stores/game-session.svelte';
	import { ACHIEVEMENT_LIST } from '$data/achievements';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	const session = getGameSession();

	$effect(() => {
		// Re-read when the panel is open (achievements can unlock at any time).
		if (!open) return;
		const t = setInterval(() => (revision += 1), 800);
		return () => clearInterval(t);
	});

	const rows = $derived.by(() => {
		void revision;
		const state = session.state;
		const unlocked = new Set(state?.achievements.serialize() ?? []);
		return ACHIEVEMENT_LIST.map((a) => {
			const done = unlocked.has(a.id);
			return {
				id: a.id,
				name: done || !a.secret ? a.name : '???',
				description: done || !a.secret ? a.description : 'Pencapaian rahasia.',
				done
			};
		});
	});

	const unlockedCount = $derived(rows.filter((r) => r.done).length);
	const pct = $derived(rows.length ? Math.round((unlockedCount / rows.length) * 100) : 0);
</script>

{#if open}
	<div class="u-scrim" role="dialog" aria-label="Pencapaian">
		<div class="panel u-panel">
			<header class="u-header">
				<h2>🏆 Pencapaian</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			<div class="progress">
				<div class="track"><div class="fill" style="width: {pct}%"></div></div>
				<span class="count">{unlockedCount}/{rows.length}</span>
			</div>
			<ul class="list">
				{#each rows as row (row.id)}
					<li class="row" class:done={row.done}>
						<span class="mark" aria-hidden="true">{row.done ? '🏅' : '🔒'}</span>
						<div class="body">
							<span class="name">{row.name}</span>
							<span class="desc">{row.description}</span>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.panel {
		width: min(460px, 100%);
		max-height: min(76vh, 620px);
		display: flex;
		flex-direction: column;
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
	.progress {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 14px;
	}
	.track {
		flex: 1;
		height: 12px;
		border-radius: var(--radius-pill);
		background: rgba(20, 12, 6, 0.5);
		overflow: hidden;
		box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.5);
	}
	.fill {
		height: 100%;
		border-radius: var(--radius-pill);
		background: linear-gradient(90deg, var(--amber-dark), var(--amber));
		box-shadow: inset 0 2px 0 rgba(247, 241, 227, 0.3);
	}
	.count {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--amber);
		font-variant-numeric: tabular-nums;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.row {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 10px 12px;
		border-radius: var(--radius);
		background: rgba(20, 12, 6, 0.25);
		border: 2px solid transparent;
		opacity: 0.7;
	}
	.row.done {
		opacity: 1;
		background: linear-gradient(180deg, rgba(107, 191, 90, 0.18), rgba(20, 12, 6, 0.2));
		border-color: rgba(107, 191, 90, 0.45);
	}
	.mark {
		font-size: 1.3rem;
		line-height: 1.2;
	}
	.body {
		display: flex;
		flex-direction: column;
	}
	.name {
		font-weight: 800;
		font-size: 0.94rem;
	}
	.desc {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}
</style>
