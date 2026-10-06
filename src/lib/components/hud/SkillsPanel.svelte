<script lang="ts">
	import { getGameSession } from '$stores/game-session.svelte';
	import { SKILL_IDS, SKILL_LABELS } from '$game/systems/skills';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	const session = getGameSession();

	const LABELS = SKILL_LABELS;

	// A friendly glyph per skill id (falls back to a star).
	const SKILL_ICON: Record<string, string> = {
		gathering: '🌿',
		crafting: '🔨',
		survival: '🔥',
		combat: '⚔️',
		fishing: '🎣'
	};

	$effect(() => {
		// Re-read on any inventory/stat change (skills change alongside them).
		const t = setInterval(() => (revision += 1), 800);
		return () => clearInterval(t);
	});

	const rows = $derived.by(() => {
		void revision;
		const state = session.state;
		if (!state) return [];
		return SKILL_IDS.map((id) => ({
			id,
			name: LABELS[id],
			level: state.skills.level(id),
			progress: state.skills.progress(id),
			xp: state.skills.xp(id)
		}));
	});
</script>

{#if open}
	<div class="u-scrim" role="dialog" aria-label="Keterampilan">
		<div class="panel u-panel">
			<header class="u-header">
				<h2>🌱 Keterampilan</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			<ul class="skills">
				{#each rows as row (row.id)}
					<li class="skill">
						<span class="badge" aria-hidden="true">{SKILL_ICON[row.id] ?? '⭐'}</span>
						<div class="main">
							<div class="top">
								<span class="name">{row.name}</span>
								<span class="level">Lv {row.level}</span>
							</div>
							<div class="bar" role="progressbar" aria-valuenow={Math.round(row.progress * 100)}>
								<div class="fill" style="width: {Math.round(row.progress * 100)}%"></div>
							</div>
							<span class="xp">{row.xp} XP</span>
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
	.skills {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.skill {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.badge {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		flex: 0 0 auto;
		font-size: 1.3rem;
		border-radius: var(--radius);
		background: linear-gradient(180deg, rgba(247, 241, 227, 0.1), rgba(20, 12, 6, 0.3));
		border: 2px solid var(--border-warm);
	}
	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.top {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		font-weight: 700;
	}
	.level {
		color: var(--amber);
	}
	.bar {
		height: 10px;
		border-radius: var(--radius-pill);
		background: rgba(20, 12, 6, 0.5);
		overflow: hidden;
		box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.5);
	}
	.fill {
		height: 100%;
		border-radius: var(--radius-pill);
		background: linear-gradient(90deg, var(--green-dark), var(--green-light));
		box-shadow: inset 0 2px 0 rgba(247, 241, 227, 0.3);
	}
	.xp {
		font-size: 0.7rem;
		color: var(--ink-muted);
	}
</style>
