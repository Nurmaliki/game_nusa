<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';
	import { BUILDING_LIST } from '$data/buildings';
	import { describePlacementIssues, type PlacementIssue } from '$game/building/placement';
	import ItemIcon from '$lib/components/inventory/ItemIcon.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	let inBuildMode = $state<string | null>(null);
	let preview = $state<{
		valid: boolean | null;
		issues: PlacementIssue[];
		missing: { id: string; qty: number }[];
	}>({
		valid: null,
		issues: [],
		missing: []
	});
	const session = getGameSession();

	$effect(() => {
		const bus = getGameBus();
		const offInv = bus.on('INVENTORY_CHANGED', (p) => (revision = p.revision));
		const offMode = bus.on('BUILD_MODE_CHANGED', (p) => (inBuildMode = p.definitionId));
		const offPreview = bus.on('BUILD_PREVIEW', (p) => {
			// The bus payload is plain (engine-agnostic); narrow it here.
			preview = {
				valid: p.valid,
				issues: p.issues as PlacementIssue[],
				missing: p.missing ?? []
			};
		});
		return () => {
			offInv();
			offMode();
			offPreview();
		};
	});

	const skills = $derived.by(() => {
		void revision;
		return session.state?.skills.toRecord() ?? {};
	});

	const buildings = $derived.by(() => {
		void revision;
		return BUILDING_LIST.filter((b) => {
			const need = b.unlock?.skill;
			if (!need) return true;
			return (skills[need.id] ?? 0) >= need.level;
		});
	});

	function canAfford(id: string): boolean {
		void revision;
		const state = session.state;
		const def = BUILDING_LIST.find((b) => b.id === id);
		if (!state || !def) return false;
		return def.requires.every((r) => state.inventory.count(r.id) >= r.qty);
	}

	function label(id: string): string {
		return getItem(id)?.name ?? id;
	}

	function have(id: string): number {
		void revision;
		return session.state?.inventory.count(id) ?? 0;
	}

	function startBuild(id: string) {
		open = false;
		getGameBus().emit('BUILD_MODE_REQUEST', { definitionId: id });
	}
</script>

{#if open}
	<div class="u-scrim" role="dialog" aria-label="Bangunan">
		<div class="panel u-panel">
			<header class="u-header">
				<h2>🏗️ Bangunan</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			<ul class="buildings">
				{#each buildings as def (def.id)}
					{@const afford = canAfford(def.id)}
					<li class="building" class:ready={afford}>
						<div class="info">
							<span class="bname">{def.name}</span>
							<span class="desc">{def.description}</span>
							<ul class="req">
								{#each def.requires as r (r.id)}
									{@const owned = have(r.id)}
									<li class:lack={owned < r.qty}>
										<ItemIcon id={r.id} size={24} dim={owned < r.qty} />
										<span>{owned}/{r.qty}</span>
									</li>
								{/each}
							</ul>
							<span class="size">Ukuran {def.size.w}×{def.size.h}</span>
						</div>
						<button class="u-btn-soft place" disabled={!afford} onclick={() => startBuild(def.id)}>
							Bangun
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

{#if inBuildMode}
	<div class="build-hint" role="status">
		<span>🖱️ Klik untuk menempatkan · R untuk memutar · Esc untuk batal</span>
		{#if preview.valid === false}
			<span class="invalid">
				⚠️ Tidak bisa dibangun: {describePlacementIssues(preview.issues)}{preview.missing.length > 0
					? ` (${preview.missing.map((m) => `${label(m.id)} kurang ${m.qty}`).join(', ')})`
					: ''}
			</span>
		{/if}
	</div>
{/if}

<style>
	.panel {
		width: min(620px, 100%);
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
	.buildings {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.building {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 14px;
		background: linear-gradient(180deg, rgba(247, 241, 227, 0.05), rgba(20, 12, 6, 0.2));
		border: 2px solid var(--border-warm);
		border-radius: var(--radius);
		padding: 12px 14px;
	}
	.building.ready {
		border-color: rgba(240, 178, 60, 0.5);
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.bname {
		font-family: var(--font-display);
		font-weight: 800;
	}
	.desc {
		font-size: 0.76rem;
		color: var(--ink-soft);
	}
	.req {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 4px 0;
		padding: 0;
	}
	.req li {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.72rem;
		font-weight: 700;
	}
	.req li.lack {
		color: var(--clay);
	}
	.size {
		font-size: 0.68rem;
		color: var(--ink-muted);
	}
	.place {
		flex-shrink: 0;
	}
	.build-hint {
		position: absolute;
		top: 96px;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(180deg, var(--panel-raised), var(--panel));
		border: 2px solid var(--wood-dark);
		border-radius: var(--radius);
		padding: 8px 16px;
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: 0.8rem;
		z-index: 30;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		box-shadow: var(--shadow-soft);
	}
	.invalid {
		color: var(--clay);
	}
</style>
