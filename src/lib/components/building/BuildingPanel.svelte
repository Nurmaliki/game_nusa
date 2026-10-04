<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';
	import { BUILDING_LIST } from '$data/buildings';
	import { describePlacementIssues, type PlacementIssue } from '$game/building/placement';

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

	function startBuild(id: string) {
		open = false;
		getGameBus().emit('BUILD_MODE_REQUEST', { definitionId: id });
	}
</script>

{#if open}
	<div class="overlay" role="dialog" aria-label="Bangunan">
		<div class="panel">
			<header>
				<h2>Bangunan</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			<ul class="buildings">
				{#each buildings as def (def.id)}
					{@const afford = canAfford(def.id)}
					<li class="building">
						<div class="info">
							<span class="bname">{def.name}</span>
							<span class="desc">{def.description}</span>
							<span class="req">
								{def.requires.map((r) => `${label(r.id)} ×${r.qty}`).join('  ·  ')}
							</span>
							<span class="size">{def.size.w}×{def.size.h}</span>
						</div>
						<button class="place" disabled={!afford} onclick={() => startBuild(def.id)}>
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
		Klik untuk menempatkan · R untuk memutar · Esc untuk batal
		{#if preview.valid === false}
			<span class="invalid">
				Tidak bisa dibangun: {describePlacementIssues(preview.issues)}{preview.missing.length > 0
					? ` (${preview.missing.map((m) => `${label(m.id)} kurang ${m.qty}`).join(', ')})`
					: ''}
			</span>
		{/if}
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
	.buildings {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.building {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 10px 12px;
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.bname {
		font-weight: 600;
	}
	.desc {
		font-size: 0.75rem;
		opacity: 0.7;
	}
	.req {
		font-size: 0.78rem;
		opacity: 0.85;
	}
	.size {
		font-size: 0.68rem;
		opacity: 0.5;
	}
	.place {
		flex-shrink: 0;
		padding: 8px 14px;
		border-radius: 8px;
		border: 1px solid #b7791f;
		background: #975a16;
		color: #fff;
		cursor: pointer;
		font-family: inherit;
	}
	.place:disabled {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.4);
		cursor: not-allowed;
	}
	.build-hint {
		position: absolute;
		top: 56px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(11, 18, 32, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 8px;
		padding: 6px 12px;
		color: #f7fafc;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		z-index: 30;
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.invalid {
		color: #fc8181;
	}
</style>
