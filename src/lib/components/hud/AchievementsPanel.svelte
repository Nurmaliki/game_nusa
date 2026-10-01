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
</script>

{#if open}
	<div class="overlay" role="dialog" aria-label="Pencapaian">
		<div class="panel">
			<header>
				<h2>Pencapaian</h2>
				<span class="count">{unlockedCount}/{rows.length}</span>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			<ul class="list">
				{#each rows as row (row.id)}
					<li class="row" class:done={row.done}>
						<span class="mark" aria-hidden="true">{row.done ? '★' : '☆'}</span>
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
		width: min(440px, 100%);
		max-height: min(70vh, 560px);
		display: flex;
		flex-direction: column;
		color: #f7fafc;
		font-family: var(--font-ui);
	}
	header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
		flex: 1;
	}
	.count {
		font-size: 0.85rem;
		opacity: 0.7;
	}
	.close {
		background: transparent;
		border: none;
		color: inherit;
		font-size: 1.2rem;
		cursor: pointer;
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
		gap: 10px;
		align-items: flex-start;
		padding: 8px 10px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.04);
		opacity: 0.7;
	}
	.row.done {
		opacity: 1;
		background: rgba(56, 161, 105, 0.16);
		border: 1px solid rgba(104, 211, 145, 0.35);
	}
	.mark {
		color: #f6c453;
		font-size: 1.1rem;
		line-height: 1.3;
	}
	.body {
		display: flex;
		flex-direction: column;
	}
	.name {
		font-weight: 600;
		font-size: 0.92rem;
	}
	.desc {
		font-size: 0.78rem;
		opacity: 0.8;
	}
</style>
