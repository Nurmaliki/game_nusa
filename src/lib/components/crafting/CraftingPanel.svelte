<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';
	import { RECIPE_LIST } from '$data/recipes';
	import { canCraft, type CraftContext } from '$game/crafting/crafting';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let revision = $state(0);
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

	const recipes = $derived.by(() => {
		void revision;
		const skillSet = ctx.skills ?? {};
		return RECIPE_LIST.filter((r) => {
			if (r.station !== 'hand' && !stations.has(r.station)) return false;
			if (r.unlock?.skill && (skillSet[r.unlock.skill.id] ?? 0) < r.unlock.skill.level)
				return false;
			return true;
		});
	});

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
		} else {
			getGameBus().emit('TOAST', { text: `Gagal: ${recipe.name}`, kind: 'warning' });
		}
	}

	function label(id: string): string {
		return getItem(id)?.name ?? id;
	}
</script>

{#if open}
	<div class="overlay" role="dialog" aria-label="Kerajinan">
		<div class="panel">
			<header>
				<h2>Kerajinan</h2>
				<button class="close" onclick={() => (open = false)} aria-label="Tutup">✕</button>
			</header>
			<ul class="recipes">
				{#each recipes as recipe (recipe.id)}
					{@const st = craftableState(recipe.id)}
					<li class="recipe">
						<div class="info">
							<span class="rname">{recipe.name}</span>
							<span class="station">{recipe.station}</span>
							<span class="ingredients">
								{recipe.ingredients.map((i) => `${label(i.id)} ×${i.qty}`).join('  ·  ')}
							</span>
							{#if st.missing.length}
								<span class="missing">
									Kurang: {st.missing.map((m) => `${label(m.id)} ×${m.qty}`).join(', ')}
								</span>
							{:else if st.reason}
								<span class="missing">{st.reason}</span>
							{/if}
						</div>
						<button class="craft" disabled={!st.ok} onclick={() => craft(recipe.id)}>Buat</button>
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
	.recipes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.recipe {
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
	.rname {
		font-weight: 600;
	}
	.station {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.55;
	}
	.ingredients {
		font-size: 0.78rem;
		opacity: 0.85;
	}
	.missing {
		font-size: 0.72rem;
		color: #f6ad55;
	}
	.craft {
		flex-shrink: 0;
		padding: 8px 14px;
		border-radius: 8px;
		border: 1px solid #388a69;
		background: #2f855a;
		color: #fff;
		cursor: pointer;
		font-family: inherit;
	}
	.craft:disabled {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.4);
		cursor: not-allowed;
	}
</style>
