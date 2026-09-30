<script lang="ts">
	import { getGameSession } from '$stores/game-session.svelte';
	import { SKILL_IDS, type SkillId } from '$game/systems/skills';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	const session = getGameSession();

	const LABELS: Record<SkillId, string> = {
		gathering: 'Mengumpulkan',
		crafting: 'Kerajinan',
		survival: 'Bertahan Hidup',
		combat: 'Pertarungan',
		fishing: 'Memancing'
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
	<div class="overlay" role="dialog" aria-label="Keterampilan">
		<div class="panel">
			<header>
				<h2>Keterampilan</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			<ul class="skills">
				{#each rows as row (row.id)}
					<li class="skill">
						<div class="top">
							<span class="name">{row.name}</span>
							<span class="level">Lv {row.level}</span>
						</div>
						<div class="bar" role="progressbar" aria-valuenow={Math.round(row.progress * 100)}>
							<div class="fill" style="width: {Math.round(row.progress * 100)}%"></div>
						</div>
						<span class="xp">{row.xp} XP</span>
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
		width: min(420px, 100%);
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
		flex-direction: column;
		gap: 4px;
	}
	.top {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
	}
	.level {
		opacity: 0.75;
	}
	.bar {
		height: 8px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: linear-gradient(90deg, #38a169, #68d391);
	}
	.xp {
		font-size: 0.7rem;
		opacity: 0.6;
	}
</style>
