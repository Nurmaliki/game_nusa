<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { RECIPE_LIST } from '$data/recipes';
	import { canCraft, type CraftContext } from '$game/crafting/crafting';
	import ItemIcon from '$lib/components/inventory/ItemIcon.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
	let filter = $state<'all' | 'craftable'>('all');
	let session = getGameSession();

	$effect(() => {
		const off = getGameBus().on('INVENTORY_CHANGED', (p) => (revision = p.revision));
		return off;
	});

	// Stations reachable from the player's current position (from GameState).
	const stations = $derived.by(() => {
		void revision;
		const state = session.state;
		if (!state) return new Set<string>(['hand']);
		return state.reachableStations();
	});

	const ctx = $derived<CraftContext>({
		availableStations: stations,
		skills: session.state?.skills.toRecord() ?? {}
	});

	const allRecipes = $derived.by(() => {
		void revision;
		const skillSet = ctx.skills ?? {};
		return RECIPE_LIST.filter((r) => {
			if (r.station !== 'hand' && !stations.has(r.station)) return false;
			if (r.unlock?.skill && (skillSet[r.unlock.skill.id] ?? 0) < r.unlock.skill.level)
				return false;
			return true;
		});
	});

	const recipes = $derived(
		filter === 'craftable' ? allRecipes.filter((r) => craftableState(r.id).ok) : allRecipes
	);

	function craftableState(recipeId: string) {
		void revision;
		const state = session.state;
		if (!state) return { ok: false, missing: [] as { id: string; qty: number }[], reason: '' };
		const recipe = RECIPE_LIST.find((r) => r.id === recipeId)!;
		const r = canCraft(state.inventory, recipe, ctx);
		if (r.ok) return { ok: true, missing: [], reason: '' };
		if (r.error.reason === 'missing_ingredients')
			return { ok: false, missing: r.error.missing, reason: '' };
		if (r.error.reason === 'missing_station')
			return { ok: false, missing: [], reason: 'Perlu stasiun' };
		if (r.error.reason === 'skill_too_low')
			return { ok: false, missing: [], reason: `Perlu keterampilan ${r.error.skill}` };
		return { ok: false, missing: [], reason: '' };
	}

	function craft(recipeId: string) {
		const state = session.state;
		if (!state) return;
		const r = state.craftAt(recipeId);
		const recipe = RECIPE_LIST.find((rc) => rc.id === recipeId)!;
		if (r.ok) {
			session.notifyInventory();
			session.emitStats();
			getGameBus().emit('SFX', { id: 'craft' });
			getGameBus().emit('TOAST', { text: `Membuat ${recipe.name}`, kind: 'success' });
			getGameBus().emit('TUTORIAL_SIGNAL', { signal: 'craft' });
		} else {
			getGameBus().emit('TOAST', { text: `Gagal: ${recipe.name}`, kind: 'warning' });
		}
	}

	function have(id: string): number {
		void revision;
		return session.state?.inventory.count(id) ?? 0;
	}

	const STATION_LABEL: Record<string, string> = {
		hand: 'Tangan',
		workbench: 'Meja Kerja',
		obsidian_forge: 'Pandai Besi',
		cooking_station: 'Dapur',
		campfire: 'Api Unggun',
		boat_workshop: 'Galangan Kapal'
	};
</script>

{#if open}
	<div class="u-scrim" role="dialog" aria-label="Kerajinan">
		<div class="panel u-panel">
			<header class="u-header">
				<h2>🔨 Kerajinan</h2>
				<div class="actions">
					<div class="filter">
						<button class:active={filter === 'all'} onclick={() => (filter = 'all')}>Semua</button>
						<button class:active={filter === 'craftable'} onclick={() => (filter = 'craftable')}>
							Bisa dibuat
						</button>
					</div>
					<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
				</div>
			</header>

			{#if recipes.length === 0}
				<p class="empty">Tidak ada resep tersedia di sini.</p>
			{:else}
				<ul class="recipes">
					{#each recipes as recipe (recipe.id)}
						{@const st = craftableState(recipe.id)}
						<li class="recipe" class:ready={st.ok}>
							<div class="result">
								<ItemIcon id={recipe.outputs[0]?.id ?? recipe.ingredients[0].id} size={40} />
								<div class="rtitle">
									<span class="rname">{recipe.name}</span>
									<span class="station">📍 {STATION_LABEL[recipe.station] ?? recipe.station}</span>
								</div>
							</div>

							<ul class="ingredients">
								{#each recipe.ingredients as ing (ing.id)}
									{@const owned = have(ing.id)}
									<li class:lack={owned < ing.qty}>
										<ItemIcon id={ing.id} size={26} dim={owned < ing.qty} />
										<span class="count">{owned}/{ing.qty}</span>
									</li>
								{/each}
							</ul>

							<div class="cta">
								{#if st.reason}
									<span class="reason">{st.reason}</span>
								{:else if st.missing.length}
									<span class="reason">Kurang bahan</span>
								{/if}
								<button class="u-btn craft" disabled={!st.ok} onclick={() => craft(recipe.id)}>
									Buat
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<style>
	.panel {
		width: min(620px, 100%);
		max-height: 90%;
		overflow: auto;
		padding: 18px;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.filter {
		display: flex;
		gap: 2px;
		background: rgba(20, 12, 6, 0.4);
		border-radius: var(--radius-pill);
		padding: 3px;
	}
	.filter button {
		border: none;
		background: transparent;
		color: var(--ink-soft);
		font-size: 0.72rem;
		font-weight: 700;
		padding: 4px 12px;
		border-radius: var(--radius-pill);
		cursor: pointer;
	}
	.filter button.active {
		background: var(--green);
		color: #16241d;
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
		text-align: center;
		margin: 30px 0;
	}
	.recipes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.recipe {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 10px 14px;
		align-items: center;
		background: linear-gradient(180deg, rgba(247, 241, 227, 0.05), rgba(20, 12, 6, 0.2));
		border: 2px solid var(--border-warm);
		border-radius: var(--radius);
		padding: 12px 14px;
	}
	.recipe.ready {
		border-color: rgba(107, 191, 90, 0.55);
	}
	.result {
		display: flex;
		gap: 12px;
		align-items: center;
		min-width: 0;
	}
	.rname {
		display: block;
		font-family: var(--font-display);
		font-weight: 800;
	}
	.station {
		font-size: 0.7rem;
		color: var(--ink-muted);
	}
	.ingredients {
		grid-column: 1 / -1;
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.ingredients li {
		position: relative;
		display: grid;
		place-items: center;
	}
	.ingredients .count {
		position: absolute;
		bottom: -4px;
		right: -4px;
		font-size: 0.6rem;
		font-weight: 800;
		background: var(--panel-inset);
		border-radius: var(--radius-pill);
		padding: 1px 5px;
		border: 1px solid var(--border-warm);
	}
	.ingredients li.lack .count {
		color: var(--clay);
		border-color: var(--clay);
	}
	.cta {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.reason {
		font-size: 0.72rem;
		color: var(--amber);
	}
	.craft {
		padding: 8px 20px;
	}
</style>
